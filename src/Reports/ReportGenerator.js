import fs from "fs";
import * as path from "path";

export class ReportGenerator {
	
	constructor(classType) {
		this.entries = [];
		this.classType = classType;
	}
	
	async generate(targetFolder) {

		// sort the report entries
		this.entries = this.entries.sort((a, b) => a.compare(b));
		
		// process all the entries asynchronously, filtering out all entries whose process function returns null  
		this.entries = (await Promise.all(this.entries.map(entry => entry.process()))).filter(entry => entry !== null);
		
		// a separate report for every year
		const endYear = new Date().getFullYear();
		for (let year = 2009; year < endYear; year++) { // in 2008 there were no cryptos, so start in 2009
			// gather all report entries for this tax year
			const reportEntries = this.entries.filter(line => line.getTaxYear() == year);
			
			if (reportEntries.length > 0) {
				// make sure the report folder exists
				const reportFolder = path.join(targetFolder, year.toString());
				if (!fs.existsSync(reportFolder)) {
					fs.mkdirSync(reportFolder);
				}
	
				let result = "";
				if (typeof this.classType.getHeadline == "function") {
					result += this.classType.getHeadline() + "\n";
				}
				for (const line of reportEntries) {
					result += await line.toString() + "\n";
				}
				
				fs.writeFileSync(path.join(reportFolder, this.classType.filename), result, "utf-8");
			}
		}
	}
	
	add() {
		const obj = new this.classType(...arguments);
		this.entries.push(obj);
		return obj;
	}
	
	get size() {
		return this.entries.length;
	}
}