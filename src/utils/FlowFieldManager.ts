import { FlowFieldController } from './FlowFieldController'
import { JsonFileParser } from './JsonFileParser'
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { notSimpleLayer } from './notSimpleLayer';


export class FlowFieldManager {
    parser: JsonFileParser;
    controller: FlowFieldController;
    statusCode: number;
    map: any;
    notSimpleLayer:any;


    constructor() {
        this.parser = new JsonFileParser('/json/flow_field_description.json');
        this.controller = new FlowFieldController();
        this.statusCode = 0;//0为未开始状态
        this.map = null;
        this.notSimpleLayer = null;
    }

    async CoreOperation() {
        await this.parser.Parsing();

        // no controller UI
        this.initMap();
    }
    initMap() {
        const opt: mapboxgl.MapboxOptions & { useWebGL2: boolean } = {
            container: "mapContainer",
            style: 'mapbox://styles/nujabesloo/clmhdapg6018i01pv0ghs04c0', // style URL
            center: [120.980697, 31.684162], // starting position [lng, lat]
            zoom: 10,
            antialias: true,
            useWebGL2: true,
            attributionControl: false,
            accessToken: 'pk.eyJ1IjoibnVqYWJlc2xvbyIsImEiOiJjbGp6Y3czZ2cwOXhvM3FtdDJ5ZXJmc3B4In0.5DCKDt0E2dFoiRhg3yWNRA',
        }
        this.map = new mapboxgl.Map(opt);

        this.map.on('load',()=>{
            const layer = new notSimpleLayer(this);
            this.map.addLayer(layer);

        })
    }
}