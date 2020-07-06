import React from 'react';
import {Form} from 'react-bootstrap';
import * as T from '../commonTypes';

interface defaultFormProps{
	controlId: string, keyProp: number, ariaLabel : string, children : string | JSX.Element, 
	defaultValue: string, defaultIndex: number, defaultOptions: string[], defaultValues: string[], handleValueChange: Function,
}
interface defaultFormState{
	options: string[], value: string
}
export class DefaultForm extends React.PureComponent<defaultFormProps, defaultFormState> {
	public static defaultProps = {
		defaultValue : "", defaultOptions: [],
	}
	updated = false;
	form = React.createRef<HTMLSelectElement>();
	state = {options: this.props.defaultOptions, value: this.props.defaultValue};
	handleChange = (event) => {
		event.stopPropagation();
		const newValue = event.target.value;
		this.setState((current) => {
			return {...current, value: newValue};
		});
		this.props.handleValueChange(newValue, this.props.controlId);
	}
	updateOptions = (newOptions, newValue) => {
		this.setState((current) => {
			return {options: newOptions, value: newValue};
		});
	}
	private addOptions = () => {
		const singleOption = (option,i) => {
			return (<option aria-label={option} key={i}>{option}</option>);
		}
		return () => this.state.options.map(singleOption);
	}
	render(){
		const props = this.props;
		return (
			<Form.Group className="form-inline" style={{marginBottom: ".25rem"}}>
				<Form.Label column sm="3">{props.children}</Form.Label>
				<Form.Control as="select" placeholder="" defaultValue={props.defaultValue} aria-label={props.ariaLabel}
				onChange={this.handleChange} ref={this.form} style={{width: "70%"}} value={this.state.value}>
					{this.addOptions()()}
				</Form.Control>
			</Form.Group>
		);
	}
	//componentDidUpdate(){}
}

const dataURL = "https://jcw780.github.io/LiveGameData2/data_uncompressed/"

const fetchJsonData = (target) => {
    return fetch(target)
        .then((response) => {
            if (!response.ok) {
            throw new Error('Network response was not ok');
			}
            return response.json();
		})
        .catch((error) => {
            console.error('There has been a problem with your fetch operation:', error);
        }
    );
}

enum singleFormIndex {name, ref, queryIndex}
type singleFormT = [string, React.RefObject<DefaultForm>, number]
type defaultFormType = T.defaultFormGeneric<singleFormT>

export class DefaultShips extends React.PureComponent
<{sendDefault: Function, reset: Function, index: number, keyProp: number, defaultData: T.defaultDataT}> {
	defaultForms : defaultFormType = Object.seal({
		version:   ['Version'   , React.createRef<DefaultForm>(), 0],
		nation:    ['Nation'    , React.createRef<DefaultForm>(), 1], 
		shipType:  ['Type'      , React.createRef<DefaultForm>(), 2], 
		ship:      ['Ship'      , React.createRef<DefaultForm>(), 3], 
		artillery: ['Artillery' , React.createRef<DefaultForm>(), 4], 
		shellType: ['Shell Type', React.createRef<DefaultForm>(), 5],
	})
	changeForm = async (value, id : keyof(defaultFormType)) => {
		//this.defaultForms[id][singleFormIndex.value] = value;
		let queryIndex = this.defaultForms[id][singleFormIndex.queryIndex];
		const queries = [
			this.queryNation, this.queryType, this.queryShip,
			this.queryArtillery, this.queryShellType, this.sendData
		]
		const defaultData = this.props.defaultData;
		if(queryIndex === 0){
			defaultData.queriedData = await fetchJsonData(
				`${dataURL}${value}_s.json`);
		}else if (queryIndex === 3){
			value = defaultData[id][T.singleDefaultDataIndex.values][
				defaultData[id][T.singleDefaultDataIndex.options].indexOf(value)
			];
		}
		defaultData[id][T.singleDefaultDataIndex.value] = value;
		for(; queryIndex <= 5; queryIndex++){
			if(queryIndex in queries){queries[queryIndex]();}
		}
	}
	updateForm = (target : keyof(defaultFormType), options, values) => {
		const refCurrent = this.defaultForms[target][singleFormIndex.ref].current;
		if(refCurrent){ 
			//apparently prevents async calls from updating deleted refs I guess...
			//fixes delete ship crash bug
			const targetData = this.props.defaultData[target]
			let newValue = targetData[T.singleDefaultDataIndex.value];
			if(!options.includes(newValue)){
				newValue = options[0];
			}
			targetData[T.singleDefaultDataIndex.options] = options;
			targetData[T.singleDefaultDataIndex.values] = values;
			if(target === 'ship'){
				targetData[T.singleDefaultDataIndex.value] = targetData[T.singleDefaultDataIndex.values][
					targetData[T.singleDefaultDataIndex.options].indexOf(newValue)
				];
			}else{
				targetData[T.singleDefaultDataIndex.value] = newValue;
			}
			refCurrent.updateOptions(options, newValue);
		}
	}
	queryVersion = async () => {
		const data = await fetchJsonData(`${dataURL}versions.json`);
		const reversed = data.reverse();
		this.updateForm('version', reversed, reversed);
		this.changeForm(reversed[0], 'version');
	}
	queryNation = () => {
		const defaultData = this.props.defaultData;
		const options = Object.keys(defaultData.queriedData.ships);
		this.updateForm('nation', options, options);
	}
	queryType = () => {
		const dData = this.props.defaultData;
		const nation = dData.nation[T.singleDefaultDataIndex.value];
		const qDataS = dData.queriedData.ships;
		const options = Object.keys(qDataS[nation]);
		this.updateForm('shipType', options, options);
	}
	queryShip = async () => {
		const dData = this.props.defaultData, qDataS = dData.queriedData.ships;
		const sDI = T.singleDefaultDataIndex.value;
		const nation = dData.nation[sDI], type = dData.shipType[sDI];
		const ships = qDataS[nation][type];
		let values = Object.keys(ships), options : string[] = [];
		values.sort((a, b) => {return ships[a]['Tier'] - ships[b]['Tier']});
		values.forEach((ship, i) => {options.push(`(${ships[ship]['Tier']}) ${ship}`);});
		this.updateForm('ship', options, values);
	}
	queryArtillery = () => {
		const dData = this.props.defaultData, qDataS = dData.queriedData.ships;
		const sDI = T.singleDefaultDataIndex.value;
		const nation = dData.nation[sDI], type = dData.shipType[sDI], ship = dData.ship[sDI];
		const options = Object.keys(qDataS[nation][type][ship].artillery);
		this.updateForm('artillery', options, options);
	}
	queryShellType = () => {
		const dData = this.props.defaultData, qDataS = dData.queriedData.ships;
		const sDI = T.singleDefaultDataIndex.value;
		const nation = dData.nation[sDI], type = dData.shipType[sDI];
		const ship = dData.ship[sDI], artillery = dData.artillery[sDI];
		const options = Object.keys(qDataS[nation][type][ship].artillery[artillery]);
		this.updateForm('shellType', options, options);
	}
	sendData = () => {
		const dData = this.props.defaultData, qDataS = dData.queriedData.ships;
		const sDI = T.singleDefaultDataIndex.value;
		const nation = dData.nation[sDI], type = dData.shipType[sDI], ship = dData.ship[sDI];
		const artillery = dData.artillery[sDI], shellType = dData.shellType[sDI];
		const shellName = qDataS[nation][type][ship].artillery[artillery][shellType];
		this.props.sendDefault(dData.queriedData.shells[shellName], ship);
	}
	private addDefaultForms = () => {
		const defaultData = this.props.defaultData;
		const singleForm = ([name, v] : [string, singleFormT], i) : JSX.Element => {
			const defaultDataN = defaultData[name];
			let defaultValue = defaultDataN[T.singleDefaultDataIndex.value];
			if(name === 'ship'){
				defaultValue = defaultDataN[T.singleDefaultDataIndex.options][
					defaultDataN[T.singleDefaultDataIndex.values].indexOf(defaultValue)]
			}

			return (<DefaultForm key={i} keyProp={this.props.keyProp} controlId={name} ref={v[singleFormIndex.ref]}
			ariaLabel={v[singleFormIndex.name]} handleValueChange={this.changeForm} 
			defaultValue={defaultValue} defaultIndex={i}
			defaultOptions={defaultDataN[T.singleDefaultDataIndex.options]}
			defaultValues={defaultDataN[T.singleDefaultDataIndex.values]}>
				{v[singleFormIndex.name]}
			</DefaultForm>);
		}
		const run = () => Object.entries(this.defaultForms).map(singleForm); return run;
	}
	render(){
		return(<>{this.addDefaultForms()()}</>);
	}
	//componentDidUpdate(){}
}

export default DefaultShips;