import axios from "axios";

export class DataManager{

    // params in jsonfile
    seedingTextureSrcArray:Array<string> = [];//area_masks 
    flowFieldTextureSrcArray:Array<string> = [];//flow_fields 
    transformTexture2DSrc:string = '';

    extent:Array<number> = [0,0,0,0];
    flowBoundary:Array<number> = [0,0,0,0];
    seedingTextureSize :Array<number> = [0,0];
    flowFieldTextureSize:Array<number> = [0,0];
    transformTextureSize:Array<number> = [0,0];
    maxDropRate:number = 0;
    maxDropRateBump:number = 0.2;
    maxSegmentNum:number = 0;
    maxStreamlineNum:number = 0;
    maxTextureSize:number = 0;

    //params in controller 
    lineNum:number = 10000;
    segmentNum:number = 8;
    fullLife:number = this.segmentNum * 10;
    progressRate:number = 0.0;
    speedFactor:number = 2.0;
    dropRate:number = 0.003;
    dropRateBump:number = 0.001;
    fillWidth:number = 1.0;
    aaWidth:number = 2.0;
    colorScheme:number = 0;
    isUnsteady:boolean = true;
    content:string = 'none';

    //other params needed
    URL:string = '';
    maxParticleNum:number = 0;
    maxBlockSize:number = 0;
    maxBlockColumns:number = 0;
    maxParticleNum_OneBlock:number = 0;



    constructor(jsonurl:string){
        this.URL = jsonurl;
    }

    async initialize() {
        let json;
        await axios.get(this.URL).then(res=>{
            
            json = res.data;
            
            this.seedingTextureSrcArray = json['area_masks'];
            this.flowFieldTextureSrcArray = json['flow_fields'];
            this.transformTexture2DSrc = json['projection']['2D'];
            this.extent = json['extent'];
            this.flowBoundary[0] = json['flow_boundary']['u_min'];
            this.flowBoundary[1] = json['flow_boundary']['v_min'];
            this.flowBoundary[2] = json['flow_boundary']['u_max'];
            this.flowBoundary[3] = json['flow_boundary']['v_max'];
            this.seedingTextureSize = json['texture_size']['area_mask'];
            this.flowFieldTextureSize = json['texture_size']['flow_field'];
            this.transformTextureSize = json['texture_size']['projection'];
            this.maxDropRate = json['constraints']['max_drop_rate'];
            this.maxDropRateBump = json['constraints']['max_drop_rate_bump'];
            this.maxSegmentNum = json['constraints']['max_segment_num'];
            this.maxStreamlineNum = json['constraints']['max_streamline_num'];
            this.maxTextureSize = json['constraints']['max_texture_size'];

            //params needed 
            this.maxParticleNum = this.maxStreamlineNum;
            this.maxBlockSize = Math.ceil(Math.sqrt(this.maxParticleNum));
            // this.maxParticleNum_OneBlock ===  this.maxStreamlineNum
            this.maxParticleNum_OneBlock = this.maxBlockSize*this.maxBlockSize;
            this.maxBlockColumns = this.maxTextureSize / this.maxBlockSize;
            
            


            
        }).catch(err=>{
            console.log("ERROR::DataManager Initialize Error" + err);
            
        })



    }





}