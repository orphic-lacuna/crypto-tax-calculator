export class ReportEntry {
	constructor(timestamp) {
		this.timestamp = timestamp;
	}
	
	compare(anotherReportEntry) {
		return this.timestamp - anotherReportEntry.timestamp;
	}
	
	getTaxYear() {
		const date = new Date(this.timestamp);
		return date.getFullYear();
	}
}