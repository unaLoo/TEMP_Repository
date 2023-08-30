export class FlowFieldController{
    //控制面板变量
    lineNum: number;
    segmentNum: number;
    fullLife: number;
    progressRate: number;
    speedFactor: number;
    dropRate: number;
    dropRateBump: number;
    fillWidth: number;
    aaWidth: number;
    colorScheme: number;
    isUnsteady: boolean;
    content: string;
    primitive: number;
    platform: string;

    constructor(){
        this.lineNum = 10000;
        this.segmentNum = 8;
        this.fullLife = this.segmentNum * 10;
        this.progressRate = 0.0;
        this.speedFactor = 2.0;
        this.dropRate = 0.003;
        this.dropRateBump = 0.001;
        this.fillWidth = 1.0;
        this.aaWidth = 2.0;
        this.colorScheme = 0;
        this.isUnsteady = true;
        this.content = "none";
        this.primitive = 0;
        this.platform = "mapbox no worker";
    }

    //省去 Constrainst，先用这里的死数据来尝试
}