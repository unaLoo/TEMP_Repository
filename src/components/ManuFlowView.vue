<template>
    <div id="container"></div>
</template>
<script lang="ts" setup>
import { onMounted } from 'vue';
import mapboxgl from 'mapbox-gl';
import "mapbox-gl/dist/mapbox-gl.css";
import {FlowLayer} from '@/manufactured/FlowLayer';
import {DataManager} from '@/manufactured/DataManager'


onMounted(async () => {
    const opt: mapboxgl.MapboxOptions & { useWebGL2: boolean} = {
        container:'container',
        style:'mapbox://styles/nujabesloo/clmhdapg6018i01pv0ghs04c0',
        useWebGL2:true,
        antialias: true,
        center:[120.980697, 31.684162],
        zoom:10,
        accessToken:'pk.eyJ1IjoibnVqYWJlc2xvbyIsImEiOiJjbGp6Y3czZ2cwOXhvM3FtdDJ5ZXJmc3B4In0.5DCKDt0E2dFoiRhg3yWNRA',
    }
    const map = new mapboxgl.Map(opt);
    const URL = '/json/flow_field_description.json';
    const dataManager = new DataManager(URL);
    await dataManager.initialize();
    
    map.on('load',()=>{
        const flowLayer = new FlowLayer(dataManager);
        map.addLayer(flowLayer);
        
    })

})

</script>
<style  coped>
    #container{
        width: 100vw;
        height: 50vh;
    }
</style>