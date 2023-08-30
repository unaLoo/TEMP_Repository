import { FlowFieldController } from './FlowFieldController'
import { JsonFileParser } from './JsonFileParser'
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { notSimpleLayer } from './notSimpleLayer';

import { GUI } from 'dat.gui';


export class FlowFieldManager {
    parser: JsonFileParser;
    controller: FlowFieldController;
    subWorkerStatus: number;
    map: any;
    notSimpleLayer:any;


    constructor() {
        this.parser = new JsonFileParser('/json/flow_field_description.json');
        this.controller = new FlowFieldController();
        this.subWorkerStatus = 0;//0为未开始状态,开始后共三个状态
        this.map = null;
        this.notSimpleLayer = null;
    }

    // MessageProcessSet() {
    //     //// 子线程传来消息时，主线程的处理设置
    //     if (!this.subWorker) return;
    //     this.subWorker.onmessage = (e: any) => {
    //         // console.log(e.data);
    //         if (e.data[0] == 1) {
    //             //subWorker Parsed
    //             this.subWorkerStatus = 1;
    //             console.log('subWorker Parsed');
                
    //         }
    //         else if (e.data[0] == 2) {
    //             //particleSystem prepared
    //             this.subWorkerStatus = 2;

    //         }
    //         else if (e.data[0] == 3) {
    //             //particleSystem simulate 
    //             if (this.subWorkerStatus == 0) return;
    //             this.subWorker.postMessage([3]);
    //             //logicCount / tickRender
    //             //get info to updateGPUmemory
    //             var infofromsimulate = 'info';
    //             this.subWorker.postMessage([3, infofromsimulate]);// start simulating
    //         }
    //         else if(e.data[0] == 4){
    //             //suspended
    //             this.subWorkerStatus = 0;
    //         }
    //     }
    // }

    async CoreOperation() {
        await this.parser.Parsing();

        this.initMap();
    }
    initMap() {
        const opt: mapboxgl.MapboxOptions & { useWebGL2: boolean } = {
            container: "mapContainer",
            style: "mapbox://styles/mapbox/navigation-night-v1", // style URL
            center: [120.980697, 31.684162], // starting position [lng, lat]
            zoom: 9,
            antialias: true,
            useWebGL2: true,
            attributionControl: false,
            accessToken: "pk.eyJ1IjoibnVqYWJlc2xvbyIsImEiOiJjbGp6Y3czZ2cwOXhvM3FtdDJ5ZXJmc3B4In0.5DCKDt0E2dFoiRhg3yWNRA"
        }
        this.map = new mapboxgl.Map(opt);

        this.map.on('load',()=>{
            const layer = new notSimpleLayer(this);
            this.map.addLayer(layer);
        })
    }

    // setGui() {
    //     const ffController = this.controller! as any;
    //     const gui = new GUI;
    //     const platformFolder = gui.addFolder("Platform");
    //     platformFolder.add(ffController, 'platform', ["mapbox no worker", "mapbox"]).onChange(()=>{
    //         switch (this.controller!.platform) {

    //             case "mapbox no worker":
    //                 console.log('触发了platform onChange事件::mapbox no worker');
                    
    //                 break;

    //             case "mapbox":
    //                 console.log('触发了platform onChange事件::mapbox');
                    
    //                 break;
    //         }
    //     });
    // }
}