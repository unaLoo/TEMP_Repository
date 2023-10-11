<template>
  
  <button @click="show1st = !show1st">{{Show1}} the smooth</button>
  <button @click="show2nd = !show2nd">{{Show2}} the manufactured</button>
  <FlowView v-if="show1st"></FlowView>
  <ManuFlowView v-if="show2nd"></ManuFlowView>
</template>

<script lang="ts" setup>

import FlowView from './components/FlowView.vue';
import ManuFlowView from './components/ManuFlowView.vue';
import { ref,computed } from 'vue';

const show1st = ref(false);
const show2nd = ref(false);

const Show1 = computed(() => show1st.value?'Close':'Show');
const Show2 = computed(() => show2nd.value?'Close':'Show');


</script>

<style>
  button {
  appearance: none;
  background-color: #FAFBFC;
  border: 1px solid rgba(27, 31, 35, 0.15);
  border-radius: 6px;
  box-shadow: rgba(27, 31, 35, 0.04) 0 1px 0, rgba(255, 255, 255, 0.25) 0 1px 0 inset;
  box-sizing: border-box;
  color: #24292E;
  cursor: pointer;
  display: inline-block;
  font-family: -apple-system, system-ui, "Segoe UI", Helvetica, Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji";
  font-size: 14px;
  font-weight: 500;
  line-height: 20px;
  list-style: none;
  padding: 6px 16px;
  position: relative;
  transition: background-color 0.2s cubic-bezier(0.3, 0, 0.5, 1);
  user-select: none;
  -webkit-user-select: none;
  touch-action: manipulation;
  vertical-align: middle;
  white-space: nowrap;
  word-wrap: break-word;
  }

  button:hover {
  background-color: #F3F4F6;
  text-decoration: none;
  transition-duration: 0.1s;
  }

  button:disabled {
  background-color: #FAFBFC;
  border-color: rgba(27, 31, 35, 0.15);
  color: #959DA5;
  cursor: default;
  }

  button:active {
  background-color: #EDEFF2;
  box-shadow: rgba(225, 228, 232, 0.2) 0 1px 0 inset;
  transition: none 0s;
  }

  button:focus {
  outline: 1px transparent;
  }

  button:before {
  display: none;
  }

  button:-webkit-details-marker {
  display: none;
  }
</style>