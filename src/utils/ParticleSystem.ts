import { JsonFileParser } from './JsonFileParser';

let gl : WebGL2RenderingContext;
export class ParticleSystem {
    updateShader: null;
    // flowBoundary: Array<number>;
    uboMapBuffer: Float32Array;
    lifeData: Float32Array;
    aliveIndexData: Float32Array;
    particleMapBuffer: Float32Array;
    parser: any;   
    maxBlockSize:number = 0;
    maxSegmentNum:number = 0;
    maxStreamlineNum:number = 0;
    texManager:any;
    phaseCount: any;
    timeLast: number =0;
    textureArraySize: number=0;
    flowFieldTextureArr:Array<any> = [null,null,null];
    seedingTextureArr:Array<any> = [null,null,null];
     

    constructor() {
        this.updateShader = null;
        this.uboMapBuffer = new Float32Array(12);
        this.lifeData = new Float32Array(0);
        this.aliveIndexData = new Float32Array(0);
        this.particleMapBuffer = new Float32Array(0);
        this.parser = null;
        
    }

    async ResourceParsing(parser:any){
        this.parser = parser;
        // uniform buffer object?  9,10,11,12?  what are they?
        this.uboMapBuffer[8]  = parser.flowBoundary[0];
        this.uboMapBuffer[9]  = parser.flowBoundary[1];
        this.uboMapBuffer[10] = parser.flowBoundary[2];
        this.uboMapBuffer[11] = parser.flowBoundary[3];

        //segment is the number of Block
        //Block size ==  the width of one Block
        this.maxBlockSize = Math.ceil(Math.sqrt(parser.maxTrajectoryNum));
        
        //other attributes can be got from this.parser
    }

    initTextureManeger(a:number,b:number,c:number,gl:WebGL2RenderingContext){
        this.texManager={
            textureViewArr : new Array(a) .fill(null),
            samplerArr : new Array(b) .fill(null),
            textureArr : new Array(c) .fill(null),
            gl : gl,
        };
    }

    async FillTexByImage(textureDataObj:any,gl:WebGL2RenderingContext,lever:number,url:string,width:number,height:number){
        
        gl.bindTexture(textureDataObj.target,textureDataObj.TEX);

    }

    async prepare(){
        // const RG32TextureViewInfo = {
        //     target:gl.TEXTURE_2D,
        //     flip:true,
        //     format:'R32G32_SFLOAT',
        //     viewType:gl.TEXTURE_2D,
        // }
        // const RGBA8TextureViewInfo = {
        //     target:gl.TEXTURE_2D,
        //     flip:true,
        //     format:'R8G8B8A8_UBYTE',
        //     viewType:gl.TEXTURE_2D,
        // }
        // const Near_Sampler = gl.createSampler()!;
        // gl.samplerParameteri(Near_Sampler, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
        // gl.samplerParameteri(Near_Sampler, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
        // gl.samplerParameteri(Near_Sampler, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        // gl.samplerParameteri(Near_Sampler, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);

        // const Linear_Sampler = gl.createSampler()!;
        // gl.samplerParameteri(Linear_Sampler, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        // gl.samplerParameteri(Linear_Sampler, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        // gl.samplerParameteri(Linear_Sampler, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        // gl.samplerParameteri(Linear_Sampler, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);

        // this.phaseCount = this.parser.flowFieldResourceArr.length;
        // this.timeLast = this.phaseCount * 300;
        // this.textureArraySize = 3;   // why 3 ????

        // for(let i = 0 ; i<this.textureArraySize ; i++){
        //     let hereFFTex = {TextureView:RG32TextureViewInfo , Sampler:Linear_Sampler};
        //     this.flowFieldTextureArr[i] = hereFFTex;
        //     // this.FillTexByImage();


        //     let hereSTex = {TextureView:RGBA8TextureViewInfo , Sampler:Near_Sampler};
        //     this.seedingTextureArr[i] = hereSTex;
        // }
        


    }
    


}