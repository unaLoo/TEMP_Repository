<template>
    <div id="mapContainer"></div>
</template>

<script lang="ts" setup>
//import..
import { onMounted } from "vue";
import {FlowFieldManager} from '@/utils/FlowFieldManager'

onMounted(async()=>{
    const ffm =  new FlowFieldManager();
    await ffm.CoreOperation();
    
})

</script>

<style>
#mapContainer{
    width: 100vw;
    height: 50vh;
}
</style>