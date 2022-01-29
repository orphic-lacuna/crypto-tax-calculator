import { expect } from "chai";
import { Tranche } from "./Tranche.js";

describe('Tranche', function() {
	let tranche;
	
	beforeEach(function() {
		tranche = new Tranche("dummy-depot", new Date().getTime() / 1000, "BTC", 1);
	});

	it('must start with no consumed coins', function() {
		expect(tranche.consumed).to.equal(0);
	});

	it('must prevent over consumption and return number of successfully consumed coins', function() {
		expect(tranche.consume(0.25, new Date().getTime() / 1000)).to.equal(0.25);
		expect(tranche.consume(2, new Date().getTime() / 1000)).to.equal(0.75);
	});
});
