import Vue from 'vue';
import Datepicker from 'vuejs-datepicker';
import Circuit from 'circuit-sdk';
import circuitLogon from '@unify/vue-components/circuit-logon.component';
import 'bootstrap/dist/css/bootstrap.css';
import './style.css';

new Vue({
  el: '#app',
  data: {
    Enums: Circuit.Enums,
    PAGE_SIZE: 100,
    client: null,
    user: null,
    convId: null,
    convName: null,
    start: null,
    end: null,
    state: null,
    result: null
  }, 
  components: {
    circuitLogon,
    Datepicker
  },
  created() {
    this.client = new Circuit.Client({
      domain: 'eu.yourcircuit.com',
      client_id: 'bc1c8421036f454ba0fa7befd3570cf7',
      scope: 'READ_USER_PROFILE,READ_CONVERSATIONS'
    });
  },
  methods: {
    onLogon(user) {
      this.user = user;
    },
    onLogout() {
      this.user = null;
    },
    async search() {
      const conv = await this.client.getConversationById(this.convId);
      this.convName = conv.topic || conv.topicPlaceholder;

      this.start = this.start || new Date(2012, 1, 1);
      this.end = this.end || new Date();

      this.state = 'SEARCHING';
      this.result = [];
      await this.searchRecursive(this.end.getTime());
      this.state = 'DONE';
    }, 
    async searchRecursive(timestamp) { 
      const items = await this.client.getConversationItems(this.convId, {
        creationDate: timestamp,
        numberOfItems: this.PAGE_SIZE
      });

      const filtered = items.reverse().filter(i => i.text && (i.text.content || i.text.subject));
      filtered.forEach(i => {
        if (i.creationTime > this.start.getTime()) {
          this.result.push({
            convId: i.convId,
            itemId: i.itemId,
            creatorId: i.creatorId,
            creationTime: i.creationTime,
            subject: i.text.subject,
            content: i.text.content
          });
        }
      }); 

      console.log(`Found ${filtered.length} more items before ${timestamp}. Total is now ${this.result.length}`);
        
      if (items.length === this.PAGE_SIZE) {
        // There are probably more. Go check.
        await this.searchRecursive(items[this.PAGE_SIZE - 1].creationTime - 1);
      } else {
        // We are done
        console.log('Export:', this.result);
        this.download();
      }     
    },
    download() {
      var element = document.createElement('a');
      element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(JSON.stringify(this.result,null, 2)));
      element.setAttribute('download', `export_${this.convId}.json`);
      element.style.display = 'none';
      document.body.appendChild(element);
      element.click();
      document.body.removeChild(element);
    }
  }
})