<template>
    <div id="mapContainer"></div>
</template>

<script lang="ts">
//import..
import { onMounted } from "vue";
import {FlowFieldManager} from '@/utils/FlowFieldManager'

 
export default {
    setup() {
        
        onMounted(async()=>{
            const ffm =  new FlowFieldManager();
            await ffm.CoreOperation();
            
            
        })
    }
}
</script>

<style>

</style>