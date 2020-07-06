import React from 'react';
import Chart from 'chart.js';
import {Scatter, defaults} from 'react-chartjs-2';
import 'chartjs-plugin-annotation';
import {Button, Collapse, Row, Col} from 'react-bootstrap';
import {Icon} from 'semantic-ui-react';

import * as T from './commonTypes';
import {DownloadButton, GeneralTooltip} from './UtilityComponents';

// chartConfigs type
interface chartDataOption{data: Record<string, any>, options: Record<string, any>}
enum singleChartIndex {config, ref, name}
type singleChartType = [chartDataOption, React.RefObject<SingleChart>, string]

interface dimensionsT {height: number, width: number}
interface singleChartProps{
    data: singleChartType, dimensions: dimensionsT
}

interface ChartInternalProps extends singleChartProps{
    datasetKeyProvider: (any: any) => string, chartRef: React.RefObject<Scatter>
}
class ChartInternal extends React.Component<ChartInternalProps>{
    render(){
        const config = this.props.data[singleChartIndex.config];
        return(
            <Scatter 
                data={config.data} 
                options={config.options}
                width={this.props.dimensions.width} 
                height={this.props.dimensions.height}
                ref={this.props.chartRef} 
                datasetKeyProvider={this.props.datasetKeyProvider}
            />
        );
    }
}

interface singleChartState{open: boolean}
export class SingleChart extends React.Component<singleChartProps, singleChartState> {
    public static defaultProps = {
        config : {data: {datasets : [],}, options: {}},
        title : ""
    }
    state = {open : true}; //apparently you need a value in state or else set state doesn't trigger rerender
    titles : T.collapseTitlesT = ["Hide: ", "Show: "]; // 0: Hide 1: Show
    wrapperRef : React.RefObject<ChartInternal> = React.createRef<ChartInternal>();
    chartRef : React.RefObject<Scatter> = React.createRef<Scatter>();
    scrollRef : React.RefObject<Button & HTMLButtonElement> = React.createRef<Button & HTMLButtonElement>();
    DownloadRef : React.RefObject<DownloadButton>[] = [
        React.createRef<DownloadButton>(), React.createRef<DownloadButton>()
    ];
    collapseId : string = 'chart'
    constructor(props){
        super(props);
        this.collapseId = props.data[singleChartIndex.name].replace(/ /g,"-");;
    }
    updateInternal = () => {
        if(this.wrapperRef.current !== undefined){
            this.wrapperRef.current!.forceUpdate();
        }
    }
    toggleCollapse = () => this.setState((current) => {return {open: !current.open}});
    updateDownloadGraph = () => {
        const url = this.chartRef.current!.chartInstance.toBase64Image();
        this.DownloadRef[0].current!.update(url, this.chartRef.current!.chartInstance.options.title.text + '.png');
    }
    updateDownloadJSON = () => {
        const data = this.chartRef.current!.chartInstance.config.data.datasets;
        const selectedData = data.map((line) => {return {label: line.label, data: line.data}});
        const url = URL.createObjectURL(new Blob([JSON.stringify(selectedData)], {type: 'text/json;charset=utf-8'}));
        this.DownloadRef[1].current!.update(url, this.chartRef.current!.chartInstance.options.title.text + '.json');
    }
    datasetKeyProvider = (dataset) => {
        // Fix bug where datasets with the same labels and different colors have the same colors
        return `${dataset.label}${dataset.borderColor}`;
    }
    render(){
        
        return(
<>
    <Button style={{width: "100%", paddingTop: "0.6rem", paddingBottom: "0.6rem", height: "3rem"}}
        onClick={this.toggleCollapse} 
        ref={this.scrollRef} 
        variant="dark"
        aria-controls={this.collapseId} 
        aria-expanded={this.state.open}
        className={this.state.open === true ? 'active' : ''}
    >{this.titles[Number(!this.state.open)] + this.props.data[singleChartIndex.name]}</Button>
    <Collapse in={this.state.open}>
        <div id={this.collapseId}>
            <ChartInternal ref={this.wrapperRef}
                data={this.props.data} 
                dimensions={this.props.dimensions} 
                datasetKeyProvider={this.datasetKeyProvider} 
                chartRef={this.chartRef}/>
            <Row style={{margin: 0}} className="justify-content-sm-center">
                <Col sm="2" style={{padding: 0}}>
                    <DownloadButton 
                        ref={this.DownloadRef[0]} 
                        updateData={this.updateDownloadGraph} 
                        label="Download Graph"
                    />
                </Col>
                <Col sm="2" style={{padding: 0}}>
                    <DownloadButton 
                        ref={this.DownloadRef[1]} 
                        updateData={this.updateDownloadJSON} 
                        label="Download Data"
                    />
                </Col>
            </Row>
        </div>
    </Collapse> 
</> 
        );
    }
    componentDidUpdate(){
        this.chartRef.current!.chartInstance.generateLegend();
    }
}

interface subGroupProps {
    config: singleChartType[], links: T.singleLinkT[], updateLinks: boolean
    onUpdate: Function,
    dimensions: {height: number, width: number},  
} 
class SubGroup extends React.Component<subGroupProps>{
    public static defaultProps = {
        updateLinks: false
    };
    private addChartInternal = () => {
        const singleChart = (value, i) : JSX.Element => {
            return (<SingleChart 
                ref={value[singleChartIndex.ref]} key={i} 
                data={value}
                dimensions={this.props.dimensions} 
                />);
        }
        const chartTarget = this.props.config;
        return () => chartTarget.map(singleChart);
    }
    private addChart = this.addChartInternal();
    render(){return(<>{this.addChart()}</>)}
    componentDidMount(){
        const links = this.props.links; //Initialize Links Names
        this.props.config.forEach((chart, i) => {
            if(links.length === i){ links.push(['', React.createRef<SingleChart>()]);}
            const link = links[i];
            link[T.singleLinkIndex.name] = chart[singleChartIndex.name]; 
            link[T.singleLinkIndex.ref] = chart[singleChartIndex.ref];
        });
    }
    componentDidUpdate(){
        if(this.props.updateLinks){
            this.props.config.forEach((chart, i) => {
                const link = this.props.links[i];
                link[T.singleLinkIndex.name] = chart[singleChartIndex.name]; 
                link[T.singleLinkIndex.ref] = chart[singleChartIndex.ref];
            });
            this.props.onUpdate(); // Update navbar links on update
        }
    }
}

// Config Type for Chart Labels / Data
interface lineT {lineLabel: string, data: string}
interface axisT {id: string, axLabel?: string, lines: lineT[]}
interface configsT{title: string, axes: axisT[]}

interface chartGroupProps{
    settings: T.settingsT, links: T.linkT, onUpdate: Function
}
export class ChartGroup extends React.Component<chartGroupProps>{
    dimensions = {height: 300, width: 1200};
    chartConfigs : Record<T.chartT, singleChartType[]> = {
        impact: [ //impact charts
            [{data: {datasets : Array<any>(),}, options: {}}, 
                React.createRef<SingleChart>(), 'Horizontal Penetration and Impact Angle'],
            [{data: {datasets : Array<any>(),}, options: {}}, 
                React.createRef<SingleChart>(), 'Deck Penetration and Impact Angle'],
            [{data: {datasets : Array<any>(),}, options: {}}, 
                React.createRef<SingleChart>(), 'Shell Flight Time and Impact Velocity'],
        ],
        angle: [ //angle charts
            [{data: {datasets : Array<any>(),}, options: {}}, 
                React.createRef<SingleChart>(), 'Maximum Angle for Perforation'],
            [{data: {datasets : Array<any>(),}, options: {}}, 
                React.createRef<SingleChart>(), 'Minimum Fusing Angle'],
        ],
        post: [ //postpenetration charts
            [{data: {datasets : Array<any>(),}, options: {}}, 
                React.createRef<SingleChart>(), ''],
            [{data: {datasets : Array<any>(),}, options: {}}, 
                React.createRef<SingleChart>(), ''],
            [{data: {datasets : Array<any>(),}, options: {}}, 
                React.createRef<SingleChart>(), ''],
            [{data: {datasets : Array<any>(),}, options: {}}, 
                React.createRef<SingleChart>(), ''],
            [{data: {datasets : Array<any>(),}, options: {}}, 
                React.createRef<SingleChart>(), ''],
            [{data: {datasets : Array<any>(),}, options: {}}, 
                React.createRef<SingleChart>(), ''],
            [{data: {datasets : Array<any>(),}, options: {}}, 
                React.createRef<SingleChart>(), ''],
            [{data: {datasets : Array<any>(),}, options: {}}, 
                React.createRef<SingleChart>(), ''],
        ]
    }
    groupRefs = {
        impact: React.createRef<SubGroup>(), 
        angle: React.createRef<SubGroup>(), 
        post: React.createRef<SubGroup>()
    };
    private callbackFunctions = {
        Penetration: (x, y) => {return `(${x}m, ${y}mm)`;},
        Angle: (x, y) => {return `(${x}m, ${y}°)`;},
        'Impact Velocity': (x, y) => {return `(${x}m, ${y}m/s)`;}, 
        Time: (x, y) => {return `(${x}m, ${y}s)`;},
        angle: (x, y) => {return `(${x}m, ${y}°)`;},
        detDist: (x, y) => {return `(${x}m, ${y}m)`;},
    }

    constructor(props){
        super(props);
        defaults.global.animation = false;
        Chart.plugins.register({ //Allows viewing of downloaded image on bright backgrounds
            beforeDraw: function(chartInstance) {
                let ctx = chartInstance.chart.ctx;
                ctx.fillStyle = "white";
                ctx.fillRect(0, 0, chartInstance.chart.width, chartInstance.chart.height);
            },
            afterLayout: function(chartInstance) {
                chartInstance.legend.legendItems.forEach((value) => {
                    value.text = value.text.replace(':', '');
                })
            }
        });
        //Preinitialize postpenetration names
        this.chartConfigs.post.forEach((chart, i) => {
            chart[singleChartIndex.name] = 'Horizontal Impact Angle ' + (i + 1);});
        
        const initialJson = require('../static/initialData.json');
        this.updateData(initialJson, false);
    }

    //Utility Functions for Graphs
    private roundStringNumberWithoutTrailingZeroes = (num: number) => {
        const dp = this.props.settings.format.rounding! ; //num = String(num);
        if (dp >= 0 && dp !== null){return Number(num.toFixed(dp));
        }else{return num;}
    }
    private localeString = (num: number) => {
        const opt = {maximumFractionDigits: 20}
        return num.toLocaleString('en-US', opt);
    }
    //Chart tooltip callbacks
    private callbackFunction = (tooltipItem, chart) => {
        let x = parseFloat(tooltipItem.label), y = parseFloat(tooltipItem.value);
        x = this.roundStringNumberWithoutTrailingZeroes(x); y = this.roundStringNumberWithoutTrailingZeroes(y);
        const namePS = (chart.datasets[tooltipItem.datasetIndex].label).split(':');
        const name = namePS.slice(1).join(':');
        const callbackFunctions = this.callbackFunctions;
        return `${name} ${callbackFunctions[
            chart.datasets[tooltipItem.datasetIndex].yAxisID](
                this.localeString(x), this.localeString(y))
        }`;
    }
    private callbackColor = (tooltipItem, chart) => {
        const color = chart.config.data.datasets[tooltipItem.datasetIndex].borderColor;
        return {borderColor: color,backgroundColor: color}
    }
    private updateDataInternal = (graphData : T.calculatedData, forceUpdate: boolean) => {
        //Common Utility Functions / Values
        const settings = this.props.settings, lineSettings = settings.line;
        const addCommas = (value, index, values) => {return value.toLocaleString();}
        const showLineValue = lineSettings.showLine, commonPointRadius = showLineValue ? 0 : lineSettings.pointRadius;
        const xAxesDistance = [{
            scaleLabel: {display: true, labelString: "Range (m)",},
            type: 'linear', ticks:{callback: addCommas}
        }];
        //For doing weird closure abuse things - tbh not sure I even need this...
        const callbackHelper = (f: Function) => {return (...args) => {f(...args)();}}
        const setXAxes = () => {
            const singleSetting = ([key, value]) => {
                if(value !== null || true ) xAxesDistance[0].ticks[key] = value;
            }
            return () => Object.entries(settings.distance).forEach(singleSetting);
        }

        const targetedArmor = `Armor Thickness: ${graphData.targets[0].armor}mm`;
        const targetInclination = `Vertical Inclination: ${graphData.targets[0].inclination}°`; 

        //Static Charts [Never changes in number]
        const staticChartTypes = Object.freeze(['impact', 'angle']);
        //Impact Charts
        const configImpact = this.chartConfigs.impact;
        const setupImpact = (row : configsT) => {
            return {
                title: {display: true, text: row.title},
                scales: {xAxes: xAxesDistance, yAxes: [
                    {id: row.axes[0].id, position: "left", 
                        scaleLabel: {display: true, labelString: row.axes[0].axLabel}
                    }, 
                    {id: row.axes[1].id, position: "right", 
                        scaleLabel: {display: true, labelString: row.axes[1].axLabel}
                    },
                ]},
                tooltips: {callbacks: {label: this.callbackFunction, labelColor: this.callbackColor}},
            }
        }
        //Angle Charts
        const configAngle = this.chartConfigs.angle;
        const ra0L = "Start Ricochet: ", ra1L = "Always Ricochet: ";

        const setupAngle = (row : configsT) => {
            return {
                title: {display: true, text: row.title},
                scales: {xAxes: xAxesDistance,
                    yAxes: [{id: "angle", postition: "left",
                        scaleLabel: {display: true, labelString: "Lateral Angle (°)",},
                        ticks:{min: 0}
                    }]
                },
                tooltips: {callbacks: {label: this.callbackFunction, labelColor: this.callbackColor}},
            }
        }

        const angleNameTemplate = (name: string) : string => `${name} | ${targetedArmor} | ${targetInclination}`;

        //Colons are used to denote split between label and name
        const staticOptionSetup : Record<'impact' | 'angle', [(configsT) => any, configsT[]]> = Object.freeze({
            impact: [setupImpact, 
                [
                    {title: configImpact[0][singleChartIndex.name], axes: [
                            {id: 'Penetration', axLabel: 'Belt Penetration (mm)', 
                            lines: [
                                {lineLabel: 'Effective Penetration: ', data: 'ePenHN'},
                                //{lineLabel: 'Raw Penetration: ', data: 'rawPen'}
                            ]},
                            {id: 'Angle', axLabel: 'Belt Impact Angle (°)', 
                            lines: [{lineLabel: 'Impact Angle: ', data: 'impactAHD'}]}
                        ],
                    },
                    {title: configImpact[1][singleChartIndex.name], axes : [
                            {id: 'Penetration', axLabel: 'Deck Penetration (mm)', 
                            lines: [{lineLabel: 'Effective Deck Penetration: ', data: 'ePenDN'}]},
                            {id: 'Angle', axLabel: 'Deck Impact Angle (°)', 
                            lines: [{lineLabel: 'Deck Impact Angle: ', data: 'impactADD'}]} 
                        ],
                    },
                    {title: configImpact[2][singleChartIndex.name], axes : [ 
                            {id: 'Impact Velocity', axLabel: 'Impact Velocity (m/s)', 
                            lines: [{lineLabel: 'Impact Velocity: ', data: 'impactV'}]},
                            {id: 'Time', axLabel: 'Flight Time (s)', 
                            lines: [{lineLabel: 'Flight Time: ', data: 'tToTargetA'}]}
                        ],
                    },
                ]
            ],
            angle: [setupAngle, 
                [
                    {title: angleNameTemplate(configAngle[0][singleChartIndex.name]), axes: [
                        {id: 'angle',
                        lines: [
                            {lineLabel: 'Maximum Perforation Angle: ', data: 'armorD'}, 
                            {lineLabel: ra0L, data: 'ra0D'}, {lineLabel: ra1L, data: 'ra1D'}, 
                        ]},
                    ]}, 
                    {title: angleNameTemplate(configAngle[1][singleChartIndex.name]), axes: [
                        {id: 'angle',
                        lines: [
                            {lineLabel: 'Minimum Fusing Angle: ', data: 'fuseD'}, 
                            {lineLabel: ra0L, data: 'ra0D'}, {lineLabel: ra1L, data: 'ra1D'}, 
                        ]},
                    ]}
                ]
            ],
        });
        const intializeStaticCharts = () => {
            const singleType = (key) => {
                const chartConfig = this.chartConfigs[key], staticOption = staticOptionSetup[key], setup = staticOption[0];
                const singleChart = (chart, i) => {
                    const config = chart[singleChartIndex.config];
                    config.data.datasets.length = 0; //empty options and datasets
                    config.options = setup(staticOption[1][i]); //set options
                }
                return () => chartConfig.forEach(singleChart);
            }
            return () => staticChartTypes.forEach(callbackHelper(singleType));
        }
        //Post-Penetration Charts
        const configPost = this.chartConfigs.post, postData = graphData.post;

        //Resizing chartConfigs.post and props.links upon addition or deletion of angles
        const resizeAngleDependents = () => {
            const angleLengthDiff = graphData.angles.length - configPost.length;
            if(angleLengthDiff > 0){
                for(let i=0; i<angleLengthDiff; i++){
                    configPost.push([{data: {datasets : Array<any>(),}, options: {}}, React.createRef<SingleChart>(), '']);
                    this.props.links.post.push(['', React.createRef<SingleChart>()]); // navbar links
                }
            }else if(angleLengthDiff < 0){
                configPost.length = graphData.angles.length;
                this.props.links.post.length = graphData.angles.length; // navbar links
            }
        }

        //Colons are used to denote split between label and name
        const WFL = "Fused: ", NFL = "No Fusing: ";
        const initializePostCharts = () => {
            const singleChart = (chart, i) => {
                chart[singleChartIndex.config].data.datasets.length = 0; // clear dataset
                chart[singleChartIndex.config].data.datasets.push( // add ship width line
                {
                    data: postData.shipWidth[0], showLine: showLineValue, borderDash: [5, 5], label: ":Ship Width", 
                    yAxisID: 'detDist', borderColor: "#505050", fill: false, 
                    pointRadius: commonPointRadius, pointHitRadius: 5 ,
                });
                chart[singleChartIndex.config].options = {
                    title: {
                        display: true,
                        text: 
                        `Internal Width Traveled before Detonation | ${targetedArmor} | ${targetInclination} | Horizontal Impact Angle: ${graphData.angles[i]}°`
                    },
                    scales: {
                        xAxes: xAxesDistance,
                        yAxes: [{
                            id: 'detDist',
                            scaleLabel: {
                                display: true,
                                labelString: "Shell Detonation Distance (m)",
                            },
                        }],
                    },
                    tooltips: {callbacks: {label: this.callbackFunction, labelColor: this.callbackColor}},            
                }
                chart[singleChartIndex.name] = `Horizontal Impact Angle ${i + 1}: ${graphData.angles[i]}°`
            } 
            return () => configPost.forEach(singleChart);
        }
        //Add Lines
        const addLine = (data : T.scatterPoint[], 
                            label: string, yAxisID : string, 
                            color : string = "") : Record<string, any> => {
            return {
                data: data, showLine: showLineValue, label: label, yAxisID: yAxisID, 
                fill: false, pointRadius: commonPointRadius, pointHitRadius: lineSettings.pointHitRadius,
                borderColor: color, backgroundColor: color
            };
        }
        const postLine = (data : T.scatterPoint[], 
            label: string, color : string = "", show : boolean = true) : Record<string, any> => {
            if(show) return addLine(data, label, 'detDist', color);
            //Special case where either shell always fuses or fails to and we still want 
            //the other line to show up in legends without erroring out
            else{ 
                return {
                    data: data, showLine: false, label: label, yAxisID: 'detDist',
                    borderColor: color, fill: false, pointRadius: 0, pointHitRadius: 0
                };
            }
        }
        const assignPredefined = (shellIndex: number, name: string, target, configs : configsT[], 
            graphData, colors : string[]) => {
            const singleChart = (chart : singleChartType, rowIndex) => {
                let counter = 0;
                const singleAxis = (axis) => {
                    const singleLine = (line) => {
                        chart[singleChartIndex.config].data.datasets.push(addLine(
                            graphData[line.data][shellIndex], 
                            line.lineLabel + name, 
                            axis.id, 
                            colors[counter]));
                        counter++;
                    }
                    return () => axis.lines.forEach(singleLine);
                }
                return () => configs[rowIndex].axes.forEach(callbackHelper(singleAxis));
            } 
            return () => target.forEach(callbackHelper(singleChart));
        }

        const addRefAngles = () => {
            const singleRef = (data, i) => {
                const singleChart = (chart) => {
                    chart[singleChartIndex.config].data.datasets.push({
                        data: data, showLine: showLineValue, borderDash: [5, 5], label: `:${graphData.refLabels[i]}`, 
                        yAxisID: 'angle', borderColor: "#505050", backgroundColor: "#505050", fill: false, 
                        pointRadius: commonPointRadius, pointHitRadius: 5 ,
                    });
                }
                return () => configAngle.forEach(singleChart); 
            }
            return () => graphData.refAngles.forEach(callbackHelper(singleRef)); 
        }
        const generateStatic = (i : number, name : string, colors : string[]) => {
            const singleItem = (type) => {
                assignPredefined(i, name, this.chartConfigs[type], staticOptionSetup[type][1], graphData[type], colors)();
            }
            return () => staticChartTypes.forEach(singleItem); 
        }
        const generatePost = (i : number, name : string, colors : string[]) => {
            const singleItem = (chart, index) => { //Post
                let pL : Array<any> = [
                    postData.fused[index + graphData.angles.length*i],
                    postData.notFused[index + graphData.angles.length*i]
                ];
                let pLShow : boolean[] = [true, true];
                for(let j=0; j<2; j++){ //react-chartjs-2 doesn't like undefined data
                    if(pL[j].length === 0){pL[j] = [{x: 0, y: 0}]; pLShow[j] = false;}
                }
                chart[singleChartIndex.config].data.datasets.push(
                    postLine(pL[0], WFL + name, colors[0], pLShow[0]),
                    postLine(pL[1], NFL + name, colors[1], pLShow[1]),
                )
            };
            return () => configPost.forEach(singleItem);
        }
        return () => {
            setXAxes()(); intializeStaticCharts()();
            resizeAngleDependents(); initializePostCharts()();
            addRefAngles()();
            //Add data
            for(let i=0; i<graphData.numShells; i++){
                const name = graphData.names[i], colors = graphData.colors[i];
                generateStatic(i, name, colors)(); generatePost(i, name, colors)();
            }
            if(forceUpdate){ //For disabling rerender in constructor [will be rendered anyways]
                this.updateCharts('impact'); //Only need to update charts not surrounding components
                this.updateCharts('angle');
                this.updateGroup('post'); //May need to for this - could optimize it later
            }
        }
    }
    updateData = (graphData : T.calculatedData, forceUpdate : boolean = true) => this.updateDataInternal(graphData, forceUpdate)();
    updateGroup = (target : T.chartT) => this.groupRefs[target].current!.forceUpdate();
    updateCharts = (target : T.chartT) => {
        const triggerChartUpdate = (value : singleChartType, i) => {
            const ref = value[singleChartIndex.ref]; 
            if(ref.current !== undefined) ref.current!.updateInternal();
        }
        this.chartConfigs[target].forEach(triggerChartUpdate);
    }
    private addChart = (target : T.chartT) => {
        const updateLinks = {impact: false, angle: false, post: true,}
        return(
            <SubGroup ref={this.groupRefs[target]}
                config={this.chartConfigs[target]} 
                links={this.props.links[target]}
                updateLinks={updateLinks[target]}
                onUpdate={this.props.onUpdate}
                dimensions={this.dimensions}
            />
        );
    }
    render(){
        return(
<>
    <GeneralTooltip title="Impact Charts" content={
        <>
        <table id="tooltip-table">
            <tbody>
            <tr><td>Effective Penetration*</td><td>Belt Impact Angle</td></tr>
            <tr><td>Effective Deck Penetration*</td><td>Deck Impact Angle</td></tr>
            <tr><td>Impact Velocity</td><td>Time to Target**</td></tr>
            </tbody>
        </table>
        * Adjusts for fall angle and normalization <br/> - does not adjust for armor inclination <br/>
        ** Scaled by x(1/3.1) ≈ game / real world  <br/>
        </>
    }>
        <div>
            <h3 style={{textAlign: "center", display:"inline-block"}}>Impact Charts</h3>
            <Icon name='question circle outline' color='grey'/>
        </div>
    </GeneralTooltip>
    {this.addChart('impact')}
    <GeneralTooltip title="Angle Charts" content={
        <>
        Shows at what target angles and ranges shells will: <br/>
        - Start Ricocheting - Always Ricochet <br/>
        - No Longer Perforate Armor <br/>
        - Start to Fuse on Armor <br/>
        Note: Adjusts for angle of fall and armor inclination
        </>
    }>
        <div>
            <h3 style={{textAlign: "center", display:"inline-block"}}>Angle Charts</h3>
            <Icon name='question circle outline' color='grey'/>
        </div>
    </GeneralTooltip>
    {this.addChart('angle')}
    <GeneralTooltip title="Post-Penetration Charts" content={
        <>
        Show how far shells would travel into a ship after penetrating armor. <br/>
        Along with whether and when shells would fuse at the given target angle. <br/>
        Note: <br/>
        - Shows x axis of distance travelled (distance travelled that is parallel to the ship's beam) <br/>
        ***This is not total distance travelled by the shell. ***<br/>
        - Adjusts for angle of fall and armor inclination
        </>
    }>
        <div>
            <h3 style={{textAlign: "center", display:"inline-block"}}>Post-Penetration Charts</h3>
            <Icon name='question circle outline' color='grey'/>
        </div>
    </GeneralTooltip>
    {this.addChart('post')}
</>
        );
    }
    //componentDidMount(){}
    //componentDidUpdate(){}
}

export default ChartGroup;