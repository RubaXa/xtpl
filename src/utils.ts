export function interpolate(value:string):string {
	const start = value.indexOf('{');
	
	if (start > -1) {
		const length = value.length;

		if (start === 0 && value.charAt(length - 1) === '}') {
			return `' + ${value.slice(1, -1)} + '`;
		} else {
			return  '';
		}
	} 

	return value;
}