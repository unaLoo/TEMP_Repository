import axios from 'axios'
export class JsonFileParser{
    //JsonFile info
    url = '';
    flowFieldResourceArr:Array<string> = [];
    seedingResourceArr:Array<string> = []
    projection2DResource = '';
    projection3DResource = '';
    flowFieldTexSize = [0.0,0.0];
    seedingTexSize = [0.0,0.0];
    projectionTexSize = [0.0,0.0];
    flowBoundary = [0.0,0.0,0.0,0.0];
    extent = [0.0,0.0,0.0,0.0];
    maxDropRate = 0.0;
    maxDropRateBump = 0.0;
    maxSegmentNum = 0.0;
    maxTrajectoryNum = 0.0;
    maxTextureSize = 0.0;

    constructor(fileurl:string){
        this.url = fileurl
    }

    async Parsing(){
        await axios.get(this.url)
        .then((response)=>{ 
            for(let item of response.data['flow_fields']){
                this.flowFieldResourceArr.push(item);
            }
            for(let item of response.data['area_masks']){
                this.seedingResourceArr.push(item)
            }

            this.projection2DResource = response.data['projection']['2D'];
            this.projection3DResource = response.data['projection']['3D'];

            this.flowFieldTexSize = response.data['texture_size']['flow_field'];
            this.seedingTexSize = response.data['texture_size']['area_mask'];
            this.projectionTexSize = response.data['texture_size']['projection'];

            this.flowBoundary[0] = response.data['flow_boundary']['u_min'];
            this.flowBoundary[1] = response.data['flow_boundary']['v_min'];
            this.flowBoundary[2] = response.data['flow_boundary']['u_max'];
            this.flowBoundary[3] = response.data['flow_boundary']['v_max'];

            this.extent[0] = response.data['extent'][0];
            this.extent[1] = response.data['extent'][1];
            this.extent[2] = response.data['extent'][2];
            this.extent[3] = response.data['extent'][3];

            this.maxDropRate = response.data['constraints']['max_drop_rate'];
            this.maxDropRateBump = response.data['constraints']['max_drop_rate_bump'];
            this.maxSegmentNum = response.data['constraints']['max_segment_num'];
            
            // trajectoryNum === streamline_num
            this.maxTrajectoryNum  = response.data['constraints']['max_streamline_num'];
            this.maxTextureSize= response.data['constraints']['max_texture_size'];
        })
    }
}