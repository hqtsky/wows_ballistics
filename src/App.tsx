import React from 'react';
import './App.css';
import 'bootstrap/dist/css/bootstrap.min.css';
import Button from 'react-bootstrap/Button';

import ShellFormsContainer from './ShellForms';
import TargetFormsContainer from './TargetForms';
import ChartGroup from './Charts';

import ShellWasm from './shellWasm.wasm';
class App extends React.Component<{},{}> {
	SFCref = React.createRef<ShellFormsContainer>();
	TFCref = React.createRef<TargetFormsContainer>();
	graphsRef : React.RefObject<ChartGroup> = React.createRef<ChartGroup>();
	instance : any;
	arrayIndices : Record<string, Record<string, number>> = {
		impactDataIndex: {}, 
		angleDataIndex: {}, 
		postPenDataIndex: {} 
	}
	constructor(props){
		super(props);
		//console.log(this.arrayIndices);
		ShellWasm().then((M) => {
			//console.log('compiled')
			this.instance = new M.shell(2);
			//console.log(this.arrayIndices);
			Object.entries(this.arrayIndices).forEach((kv: any) => {
				const k = kv[0];
				const v = kv[1];
				//console.log(v);
				Object.entries(M[k]).forEach((kv1: any) => {
					//console.log(kv1);
					const k1 = kv1[0];
					const v1 = kv1[1];
					if(k1 !== "values"){
						v[k1] = v1.value;
					}
				});
			})
			//console.log(this.arrayIndices);
		});
	}
	generate = () => {
		const shellData = this.SFCref.current!.returnShellData();
		const tgtData = this.TFCref.current!.returnData();
		const numShells: number = shellData.length;
		console.log(shellData, tgtData);
		this.instance.resize(numShells);
		shellData.forEach((value, i) => {
			this.instance.setValues(value.caliber, 
				value.muzzleVelocity, value.dragCoefficient,
				value.mass, value.krupp, value.normalization,
				value.fusetime, value.threshold, value.ra0,
				value.ra1, i);
		})
		this.instance.calcImpactForwardEuler();
		this.instance.calcAngles(tgtData.armor, tgtData.inclination);
		this.instance.calcPostPen(tgtData.armor, tgtData.inclination,
			tgtData.angles, true, true);
		const impactSize: number = this.instance.getImpactSize();
		const numAngles: number = tgtData.angles.length;
		const output = {
			impact: {
				ePenHN : Array.from({length: numShells}, _ => new Array<Record<string, number>>(impactSize)),
				impactAHD : Array.from({length: numShells}, _ => new Array<Record<string, number>>(impactSize)),
				ePenDN : Array.from({length: numShells}, _ => new Array<Record<string, number>>(impactSize)),
				impactADD : Array.from({length: numShells}, _ => new Array<Record<string, number>>(impactSize)),
				impactV: Array.from({length: numShells}, _ => new Array<Record<string, number>>(impactSize)),
				tToTargetA: Array.from({length: numShells}, _ => new Array<Record<string, number>>(impactSize)),
			},
			angle: {
				armorD : Array.from({length: numShells}, _ => new Array<Record<string, number>>(impactSize)),
				fuseD : Array.from({length: numShells}, _ => new Array<Record<string, number>>(impactSize)),
				ra0D : Array.from({length: numShells}, _ => new Array<Record<string, number>>(impactSize)),
				ra1D : Array.from({length: numShells}, _ => new Array<Record<string, number>>(impactSize)),
			},
			post: {
				shipWidth : Array.from({length: 1}, _ => new Array<Record<string, number>>(impactSize)),
				notFused: Array.from({length: numShells * numAngles}, _ => new Array<Record<string, number>>()),
				Fused: Array.from({length: numShells * numAngles}, _ => new Array<Record<string, number>>()),
			},
			numShells : numShells,
			names : Array<string>(numShells),
			colors : Array<Array<string>>(numShells),
			targets : Array<Record<string, number>>(1),
			angles : tgtData.angles
		}
		output.targets[0] = {armor: tgtData.armor, inclination: tgtData.inclination, width: tgtData.width}
		shellData.forEach((value, i) => {
			output.names[i] = value.name;
			output.colors[i] = value.colors;
		});
		let maxDist = 0;
		let maxShell = 0;
		for(let j=0; j<numShells; j++){
			let maxDistS = 0;
			for(let i=0; i<impactSize; i++){
				//console.log(i, j);
				const dist = this.instance.getImpactPoint(i, this.arrayIndices.impactDataIndex.distance, j);
				maxDistS = dist > maxDistS ? dist : maxDistS;
				Object.entries(output.impact).forEach((kv : any) => {
					const k = kv[0];
					const v = kv[1];
					//console.log(i, j, kv, v[j][i], v[0] === v[1]);
					v[j][i] = {
						x: dist, 
						y: this.instance.getImpactPoint(i, this.arrayIndices.impactDataIndex[k], j)
					};
				});
				Object.entries(output.angle).forEach((kv : any) => {
					const k = kv[0];
					const v = kv[1];
					//console.log(i, j, kv, v[j][i], v[0] === v[1]);
					v[j][i] = {
						x: dist, 
						y: this.instance.getAnglePoint(i, this.arrayIndices.angleDataIndex[k], j)
					};
				});
				/*Object.entries(output.post).forEach((kv : any) => {
					const k = kv[0];
					const v = kv[1];
					//console.log(i, j, kv, v[j][i], v[0] === v[1]);
					v[j][i] = {
						x: dist, 
						y: this.instance.getPostPenPoint(i, this.arrayIndices.postPenDataIndex[k], j)
					};
				});*/
			}
			const greater = maxDistS > maxDist;
			maxDist = greater ? maxDistS : maxDist;
			maxShell = greater ? j : maxShell;
		}
		console.log(output);
		if(this.graphsRef.current){
			this.graphsRef.current.updateData(output);
		}
	}
	render () {
		return (
			<div className="App">
				<ShellFormsContainer ref={this.SFCref}/>
				<TargetFormsContainer ref={this.TFCref}/>
				<Button onClick={this.generate}>Generate</Button>
				<ChartGroup ref={this.graphsRef}/>
			</div>
		);
	}
	componentDidMount(){
		console.log("done rendering");
		//console.log(this);
	}
}



export default App;
