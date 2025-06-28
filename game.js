class Generator{
    constructor(name, cost, gain, upgrades, locked = true) {
        this.name = name;
        this.amount = 0;

        // Cost properties.
        this.cost = cost;
        this.originalCost = cost;

        // Gain properties.
        this.baseGain = gain;
        this.gain = 0;
        this.multiplier = 1;
        this.specialMPS = 0;

        // Upgrade and lock status.
        this.upgrades = upgrades;
        this.locked = locked;
    }

buy(amount){
    const player = game.player;
    let totalCost = this.getCost(amount);

    // Abort if the player can't afford the purchase.
    if (!player.spendMutations(totalCost)) return;

    // Update amount and cost.
    this.amount += amount;
    this.cost = Math.round(this.cost * Math.pow(1.10, amount));

    // Flag MPS for recalculation.
    game.settings.recalculateMPS = true;

    // Unlock the next generator if applicable.
    let curIndex = game.utilities.getGeneratorIndexByName(this.name);
    let nextGenerator = game.generators[curIndex + 1];

    if (nextGenerator && nextGenerator.locked) {
        nextGenerator.locked = false;
        game.constructShop();
    }
}

setCost(){
        this.cost = this.originalCost;
		//Increment generator cost.
        for (let i = 0; i < this.amount; i++) {
            this.cost = Math.round(this.cost * 1.10);
        }
}

buyUpgrade(name) {
    const player = game.player;
	//Find upgrade via find().
    let upgrade = this.upgrades.find(u => u.name === name);
	//Exit when no upgrade is found.
    if (!upgrade || upgrade.owned) return;
	//Exit when score is insufficient.
    if (!player.spendMutations(upgrade.cost)) return;

    //Set to true and redo score per second.
    upgrade.owned = true;
    game.settings.recalculateMPS = true;
}

calculateUpgradeGain() {
    const player = game.player;
	// Initialize multiplier.
    let multiplier = 1; 
	// Get total generator count.
    let generatorCount = game.utilities.getGeneratorCount(); 
	// Reset special MPS.
    this.specialMPS = 0; 

    // Special handling for mouse clicks.
    if (this.name === 'Cell Injector') {
		// Set mutations per click (aMPC) to 1 for this upgrade.
        player.aMPC = 1; 
    }

    // Loop through each upgrade to calculate the gain.
    this.upgrades.forEach(upgrade => {
        if (upgrade.owned) {
            // If the upgrade is not special, apply the normal multiplier.
            if (!upgrade.special) {
				// Double the multiplier for regular upgrades.
                multiplier *= 2; 

                // Special case for first generator.
                if (this.name === 'Cell Injector') {
					// Double mutation per click for injector upgrades.
                    player.aMPC *= 2; 
                }
            } else {
                // Handle special upgrades differently.
                switch (this.name) {
                    case 'Cell Injector': {
                        // Calculate the effect of special upgrades for the "Cell Injector".
                        let nonInjectorGeneratorCount = generatorCount - this.amount;
                        this.specialMPS += (upgrade.special * nonInjectorGeneratorCount) * this.amount;
						// Increase mutations per click.
                        player.aMPC += (upgrade.special * nonInjectorGeneratorCount);
                        break;
                    }
                }
            }
        }
    });

    // Return the final multiplier.
    return multiplier;
}

getMPS() {
        this.multiplier = this.calculateUpgradeGain();
		//Formula for mutations per second ((Generator points * amount) * multipliers) + (generators - injectors).
        this.gain = ((this.baseGain * this.amount) * this.multiplier) + this.specialMPS;
        return this.gain;
}

getCost(amount) {
        let bulkCost = this.cost;
        let tempPrice = this.cost;
		//Bulk buy implementation.
        for (let i = 0; i < amount - 1; i++) {
            bulkCost += Math.round(tempPrice *= 1.10);
        }
        return bulkCost;
    }
	//Html Button handling.
generateMenuButton() {
        return `<button onclick="game.updateShop('${this.name}');">${this.name}</button>`;
    }   

generateBuyButtons() {
        let format = game.utilities.formatNumber;
        let html = '<div class="btnBuyGroup">';
        html += `<button onclick="game.buyGenerator('${this.name}', 1);">Buy x1</br><b>${format(this.cost)}</b></button>`
        html += `<button onclick="game.buyGenerator('${this.name}', 5);">Buy x5</br><b>${format(this.getCost(5))}</b></button>`;
        html += `<button onclick="game.buyGenerator('${this.name}', 10);">Buy x10</br><b>${format(this.getCost(10))}</b></button>`;
        html += '</div>';
        return html;
    }
	//Upgrade button functionality and condition.
generateUpgradeButtons() {
        let html = '';
        let condition = false;
        this.upgrades.forEach(upgrade => {
            let format = game.utilities.formatNumber;
            if (upgrade.owned == false) {
                if (upgrade.conditionMet(this.amount)) {
                    html += `<button class="upgBtn" onclick="game.buyUpgrade('${this.name}', '${upgrade.name}')"><b>${upgrade.name}</b></br>${upgrade.description}</br><b>${format(upgrade.cost)}</b></button>`
                } else {
                    if (condition == false) {
                        condition = true;
                        html += `</br><button class="upgNext">Next upgrade in <b>${upgrade.limit - this.amount}</b> more ${this.name.toLowerCase()}(s)</button>`;
                    }
                }
            }
        });
        return html;
    }
	//Additional generator explanation text implementation.
generateShopHTML() {
        let format = game.utilities.formatNumber;
        let singleEffect = (this.baseGain * this.multiplier)
        if (this.specialMPS > 0) {
            singleEffect += (this.specialMPS / this.amount);
        }
        let html = `<b>${this.name}</b></br>You have <b>${this.amount}</b> ${this.name.toLowerCase()}(s).</br>Each ${this.name.toLowerCase()} produces <b>${format(singleEffect)}</b> mutation(s).</br>All of your ${this.name.toLowerCase()}(s) combined produces <b>${format(this.gain)}</b> mutation(s).</br>${this.generateBuyButtons()}</br>${this.generateUpgradeButtons()}`;
        return html;
    }
}

class Upgrade {
    constructor(name, cost, description, limit, special = false) {
        this.name = name;
        this.cost = cost;
        this.description = description;
        this.limit = limit; 
        this.owned = false;
        this.special = special;
    }
	//Unblocker for when enough generators are purchased.
    conditionMet(amount) {
        if (amount >= this.limit) {
            return true;
        }
    }
}

//Extra options button implementation.
function Details() {
  const x = document.getElementById("optionContainer");
  if (x.style.display === "none") {
    x.style.display = "block";
  } else {
    x.style.display = "none";
  }
}
class Player {
    constructor() {
        this.mutations = 0;
	//Tracker.
        this.mutationStats = {
            Earned: 0,
            Spent: 0,
            Clicked: 0
        }
	//Score per frame variable.
        this.aMPF = 0;
	//Score per click variable.
        this.aMPC = 1;
    }

    earnMutation(amount) {
        this.mutations += amount;
        this.mutationStats.Earned += amount;
    }

    spendMutations(amount) {
        if (this.mutations >= amount) {
            this.mutations -= amount;
            this.mutationStats.Spent += amount;
            return true;
        }
    }
    //Click stat.
    clickMutation() {
	this.earnMutation(this.aMPC);
        this.mutationStats.Clicked += 1;
    }
}
	

let game = {
    settings: {
        frameRate: 30,
        recalculateMPS: true,
        key: 'Mutationclicker'
    },
    generators: [
        // All generators and upgrades
        new Generator('Cell Injector', 10, 0.1, [
            new Upgrade('Reinforced Protein Spike', 100, 'Injectors and clicking are twice as efficient', 1),
            new Upgrade('Lipid Shield Gel', 500, 'Injectors and clicking are twice as efficient', 1),
            new Upgrade('Symmetrical Appendages', 10000, 'Injectors and clicking are twice as efficient', 10),
            new Upgrade('Thousand Tentacles', 100000, 'Injectors and clicking gain +0.1 mutations for every non-injector generator owned', 25, 0.1),
            new Upgrade('Million Tentacles', 10000000, 'Injectors and clicking gain +0.5 mutations for every non-injector generator owned', 50, 0.5),
            new Upgrade('Billion Tentacles', 100000000, 'Injectors and clicking gain +5 mutations for every non-injector generator owned', 100, 5),
            new Upgrade('Trillion Tentacles', 1000000000, 'Injectors and clicking gain +50 for every non-injector generator owned', 150, 50),
            new Upgrade('Quadrillion Tentacles', 10000000000, 'Injectors and clicking gain +500 mutations for each non-injector generator owned', 200, 500),
            new Upgrade('Quintillion Tentacles', 10000000000000, 'Injectors and clicking gain +5.000K for every non-injector generator owned', 250, 5000),
            new Upgrade('Sextillion Tentacles', 10000000000000000, ' Injectors and clicking gain +50.000K for every non-injector generator owned', 300, 50000),
            new Upgrade('Septillion Tentacles', 10000000000000000000, 'Injectors and clicking gain +500.000K for every non-injector generator owned', 350, 500000),
            new Upgrade('Octillion Tentacles', 10000000000000000000000, 'Injectors and clicking gain +5.000M for each non-injector generator owned', 400, 5000000)
        ], false),
        new Generator('Bacterium', 100, 1, [
            new Upgrade('Contaminated Email Chain', 1000, 'Bacteriums are twice as efficient', 1),
            new Upgrade('Biofilm Plating', 5000, 'Bacteriums are twice as efficient', 5),
            new Upgrade('Mucosal Slipstream', 20000, 'Bacteriums are twice as efficient', 25),
            new Upgrade('Fermentation Surge', 2000000, 'Bacteriums are twice as efficient', 50),
            new Upgrade('Antibiotic-Dodging Enzymes', 200000000, 'Bacteriums are twice as efficient', 100),
            new Upgrade('Accelerated Aging Toxins', 20000000000, 'Bacteriums are twice as efficient', 150),
            new Upgrade('Hyperactive Pili', 20000000000000, 'Bacteriums are twice as efficient', 200),
            new Upgrade('Unrestricted Division Protocol', 20000000000000000, 'Bacteriums are twice as efficient', 250),
            new Upgrade('Memory Cell Override', 20000000000000000000, 'Bacteriums are twice as efficient', 300),
            new Upgrade('Genome-Hiding Mutation', 20000000000000000000000, 'Bacteriums are twice as efficient', 350),
            new Upgrade('Polite Surface Proteins', 200000000000000000000000000, 'Bacteriums are twice as efficient', 400),
        ]),
        new Generator('Virus', 1100, 10, [
			new Upgrade('Contaminated Soil', 11000, 'Viruses are twice as efficient', 1),
			new Upgrade('Spore Enrichment', 55000, 'Viruses are twice as efficient', 5),
			new Upgrade('Toxic Irrigation', 300000, 'Viruses are twice as efficient', 25),
			new Upgrade('Pathogen Engineering', 30000000, 'Viruses are twice as efficient', 50),
			new Upgrade('Infected Scarecrows', 3000000000, 'Viruses are twice as efficient', 100),
			new Upgrade('Biohazard Sprinklers', 300000000000, 'Viruses are twice as efficient', 150),
			new Upgrade('Mutagenic Fungus', 300000000000000, 'Viruses are twice as efficient', 200),
			new Upgrade('Neurospore Bloom', 300000000000000000, 'Viruses are twice as efficient', 250),
			new Upgrade('Targeted Vectoring', 300000000000000000000, 'Viruses are twice as efficient', 300),
			new Upgrade('Plague Sigils', 300000000000000000000000, 'Viruses are twice as efficient', 350),
			new Upgrade('Wyrmspores', 3000000000000000000000000000, 'Viruses are twice as efficient', 400)
        ]),
		new Generator('Amoeba', 12000, 100, [
			new Upgrade('Protein Coating', 120000, 'Amoeba are twice as efficient', 1),
			new Upgrade('Cytoplasmic Boost', 400000, 'Amoeba are twice as efficient', 5),
			new Upgrade('RNA Splicing', 4000000, 'Amoeba are twice as efficient', 25),
			new Upgrade('Mitosis Surge', 400000000, 'Amoeba are twice as efficient', 50),
			new Upgrade('Endosymbiotic Hack', 40000000000, 'Amoeba are twice as efficient', 100),
			new Upgrade('Host Override', 4000000000000, 'Amoeba are twice as efficient', 150),
			new Upgrade('Transdimensional Cytoplasm', 4000000000000000, 'Amoeba are twice as efficient', 200),
			new Upgrade('Viral Terraforming', 4000000000000000000, 'Amoeba are twice as efficient', 250),
			new Upgrade('Genome Liquefier', 4000000000000000000000, 'Amoeba are twice as efficient', 300),
			new Upgrade('Eukaryotic Hive-mind', 4000000000000000000000000, 'Amoeba are twice as efficient', 350),
			new Upgrade('Molecular Dominion', 40000000000000000000000000000, 'Amoeba are twice as efficient', 400)
        ]),
		new Generator('Fungi', 130000, 1000, [
			new Upgrade('Spore Bloom', 1300000, 'Fungi are twice as efficient', 1),
			new Upgrade('Hyphal Network', 5000000, 'Fungi are twice as efficient', 5),
			new Upgrade('Mycelial Surge', 50000000, 'Fungi are twice as efficient', 25),
			new Upgrade('Neurospora Infusion', 5000000000, 'Fungi are twice as efficient', 50),
			new Upgrade('Host Tissue Binding', 500000000000, 'Fungi are twice as efficient', 100),
			new Upgrade('Parasitic Expansion', 50000000000000, 'Fungi are twice as efficient', 150),
			new Upgrade('Fungal Overclocking', 50000000000000000, 'Fungi are twice as efficient', 200),
			new Upgrade('Symbiotic Takeover', 50000000000000000000, 'Fungi are twice as efficient', 250),
			new Upgrade('Invasive Rhizomorphs', 50000000000000000000000, 'Fungi are twice as efficient', 300),
			new Upgrade('Biofilm Saturation', 50000000000000000000000000, 'Fungi are twice as efficient', 350),
			new Upgrade('Cordyceps Directive', 500000000000000000000000000000, 'Fungi are twice as efficient', 400)
        ]),
		new Generator('Prion', 1400000, 10000, [
			new Upgrade('Protein Misfolding', 14000000, 'Prions are twice as efficient', 1),
			new Upgrade('Amyloid Seeds', 60000000, 'Prions are twice as efficient', 5),
			new Upgrade('Neuroinvasion', 600000000, 'Prions are twice as efficient', 25),
			new Upgrade('Tau Propagation', 60000000000, 'Prions are twice as efficient', 50),
			new Upgrade('Cross-Species Transmission', 6000000000000, 'Prions are twice as efficient', 100),
			new Upgrade('Synaptic Hijacking', 600000000000000, 'Prions are twice as efficient', 150),
			new Upgrade('Host Reprogramming', 600000000000000000, 'Prions are twice as efficient', 200),
			new Upgrade('Cerebral Colonization', 600000000000000000000, 'Prions are twice as efficient', 250),
			new Upgrade('Molecular Echo', 600000000000000000000, 'Prions are twice as efficient', 300),
			new Upgrade('Neural Collapse', 600000000000000000000000, 'Prions are twice as efficient', 350),
			new Upgrade('Transcendental Degeneration', 6000000000000000000000000000, 'Prions are twice as efficient', 400)
        ]),
		new Generator('Parasite', 20000000, 100000, [
			new Upgrade('Cyst Formation', 200000000, 'Parasites are twice as efficient', 1),
			new Upgrade('Vector Domestication', 7000000000, 'Parasites are twice as efficient', 5),
			new Upgrade('Egg Flooding', 70000000000, 'Parasites are twice as efficient', 25),
			new Upgrade('Neural Override', 7000000000000, 'Parasites are twice as efficient', 50),
			new Upgrade('Host Genome Editing', 700000000000000, 'Parasites are twice as efficient', 100),
			new Upgrade('Symbiotic Deception', 70000000000000000, 'Parasites are twice as efficient', 150),
			new Upgrade('Reproductive Piracy', 70000000000000000000, 'Parasites are twice as efficient', 200),
			new Upgrade('Hive Mind Infusion', 70000000000000000000000, 'Parasites are twice as efficient', 250),
			new Upgrade('Cognitive Dissonance Field', 70000000000000000000000000, 'Parasites are twice as efficient', 300),
			new Upgrade('Spinal Taproot', 70000000000000000000000000000, 'Parasites are twice as efficient', 350),
		new Upgrade('Neurodivine Ascension', 700000000000000000000000000000000, 'Parasites are twice as efficient', 400)
        ])
    ],
    utilities: {
		//Short abbreviation number list.
        ShortNumbers: ['K', 'M', 'B', 'T', 'Qua', 'Qui', 'Sex', 'Sep', 'Oct', 'Non', 'Dec', 'Und', 'Duo', 'Tre', 'QuaD', 'QuiD', 'SexD', 'SepD', 'OctD', 'NonD', 'Vig'],
        updateText (className, text) {
            let elements = document.getElementsByClassName(className);
            for(var i in elements) {
                elements[i].innerHTML = text;
            }
        },
		//Truncation for every 10^3 numbers.
        formatNumber (number) {
            let formatted = '';
            if (number >= 1000) {
                for (let i = 0; i < game.utilities.ShortNumbers.length; i++) {
                    let divider = Math.pow(10, (i + 1) * 3)
                    if (number >= divider) {
                        formatted = (Math.trunc((number / divider) * 1000) / 1000).toFixed(3) + ' ' + game.utilities.ShortNumbers[i];
                    }
                }
                return formatted;
            }
            return (Math.trunc(number * 10) / 10).toFixed(1);
        },
		//Genenator name index, list index and count functions.
        getGeneratorByName (name) {
            let correctGenerator = null;
            game.generators.forEach(generator => {
                if (generator.name == name) {
                    correctGenerator = generator;
                    return;
                }
            });
            return correctGenerator;
        },
        getGeneratorIndexByName (name) {
            for (let i = 0; i < game.generators.length - 1; i++) {
                let curGenerator = game.generators[i];
                if (curGenerator.name == name) {
                    return i;
                }
            }
        },
        getGeneratorCount () {
            let amount = 0;
            game.generators.forEach(generator => {
                amount += generator.amount;
            });
            return amount;
        },
		//Support bool func for locks.
        stringToBool (string) {
            switch (string) {
                case 'true':
                    return true;
                case 'false':
                    return false;
            }
        }
    },
	//Saving, loading and clearing implementations.
    saving: {
        export () {
            let saveString = '';
            saveString += `${game.player.mutations}|${game.player.mutationStats.Earned}|${game.player.mutationStats.Spent}|${game.player.mutationStats.Clicked}-`;
            let first = true;
            game.generators.forEach(generator => {
                if (first) {
                    first = false;
                    saveString += `${generator.amount}|false|`;
                } else {
                    saveString += `#${generator.amount}|${generator.locked}|`;
                }
                generator.upgrades.forEach(upgrade => {
                    saveString += `${upgrade.owned}:`;
                });
                saveString = saveString.slice(0, -1);
            });
            game.saving.saveToCache(saveString);
            return saveString;
        },
        import (saveString) {
            if (saveString != false) {
                saveString = saveString.split('-');
                game.saving.loadPlayer(saveString[0]);
                game.saving.loadGenerators(saveString[1]);
                game.settings.recalculateMPS = true;
                game.updateShop(game.currentShop);
            } else {
                alert('Save could not be loaded.');
            }
        },
        saveToCache (saveString) {
            try {  return window.localStorage.setItem(game.settings.key, saveString); } catch { console.log('Could not save to cache.'); }
        },
        getSaveFromCache () {
            try {  return window.localStorage.getItem(game.settings.key); } catch { console.log('Save does not exist.'); }
        },
        loadPlayer (playerData) {
            playerData = playerData.split('|');
            try {
                game.player.mutations = parseFloat(playerData[0]);
                game.player.mutationStats.Earned = parseFloat(playerData[1]);
                game.player.mutationStats.Spent = parseFloat(playerData[2]);
                game.player.mutationStats.Clicked = parseFloat(playerData[3]);
            } catch { console.log('Loading failed, check data for which value went missing.') }
        },
        loadGenerators (generatorData) {
            generatorData = generatorData.split('#');
            try {
                for (let i = 0; i < game.generators.length; i++) {
                    let savedGenerator = generatorData[i];
                    let nonUpgrade = savedGenerator.split('|');
                    let generator = game.generators[i];
                    generator.amount = parseFloat(nonUpgrade[0]);
                    generator.setCost();
                    generator.locked = game.utilities.stringToBool(nonUpgrade[1]);
                    let j = 0;
                    let upgrades = nonUpgrade[2].split(':');
                    generator.upgrades.forEach(upgrade => {
                        upgrade.owned = game.utilities.stringToBool(upgrades[j]);
                        j++;
                    });
                }
            } catch { console.log('Loading failed, check generator order again.') }
        },
        wipeSave() {
            if (confirm('Are you sure you want to wipe your save?')) {
                game.player.mutations = 0;
                game.player.mutationStats.Earned = 0;
                game.player.mutationStats.Spent = 0;
                game.player.mutationStats.Clicked = 0;
                game.generators.forEach(generator => {
                    generator.locked = true;
                    generator.amount = 0;
                    generator.gain = 0;
                    generator.specialMPS = 0;
                    generator.setCost();
                    for(var i in generator.upgrades) {
                        generator.upgrades[i].owned = false;
                    }
                });
		game.generators[0].locked = false;
                game.constructShop();
                game.updateShop('Cell Injector');
                game.settings.recalculateMPS = true;
            }
        },
        importing: false,
        openBox(type) {
            let container = document.getElementsByClassName('importExportBox')[0];
            let box = document.getElementById('saveBox');
			const x = document.getElementById("optionContainer");
			x.style.display = "none";
            switch(type) {
                case 'import':
                    this.importing = true;
                    container.style.visibility = 'visible';
                    box.removeAttribute('readonly');
                    box.value = '';
                    return;
                case 'export':
                    let saveString = this.export();
                    container.style.visibility = 'visible';
                    box.value = saveString;
                    box.setAttribute('readonly', true);
                    return;
            }
        },
        closeBox () {
            document.getElementsByClassName('importExportBox')[0].style.visibility = 'hidden';
            if (this.importing) {
                let box = document.getElementById('saveBox');
                this.import(box.value);
				location.reload();
                box.value = '';
            }
        }
    },
    player: new Player(),
    logic () {
        game.updateDisplays();
        // Recalculate when needed, otherwise can cause freezes.
        if (game.settings.recalculateMPS == true) {
            let MPS = 0;
            game.generators.forEach(generator => {
                MPS += generator.getMPS();
            });
            game.settings.recalculateMPS = false;
            game.player.aMPF = MPS / game.settings.frameRate;
            game.updateShop(game.currentShop);
        }
        if (document.hasFocus()) {
            game.player.earnMutation(game.player.aMPF);
            game.saving.export();
            setTimeout(game.logic, 1000 / game.settings.frameRate);
        } else {
            game.player.earnMutation(game.player.aMPF * game.settings.frameRate);
            game.saving.export();
            setTimeout(game.logic, 1000);
        }
    },
	//<!-- HTML-related updating -->
	//Number updates.
    updateDisplays () {
		//Quick attribution to make it easier.
		let player = game.player;
		let stats = player.mutationStats;
		let format = game.utilities.formatNumber;
        let updateText = game.utilities.updateText;
        document.title = 'Mutation Clicker | ' + format(player.mutations);
        updateText('mutationDisplay', format(player.mutations));
        updateText('mpcDisplay', format(player.aMPC));
        updateText('mpsDisplay', format(player.aMPF * game.settings.frameRate));
        updateText('earnedDisplay', format(stats.Earned));
        updateText('spentDisplay', format(stats.Spent));
        updateText('clickedDisplay', format(stats.Clicked));
    },
	//Shop list construction and updates.
    constructShop () {
        let generators = game.generators;
        let finalHtml = '';
        generators.forEach(generator => {
            if (generator.locked == false) {
                finalHtml += generator.generateMenuButton();
            }
        });
        game.utilities.updateText('shopList', finalHtml);
    },
    currentShop: 'Cell Injector',
    updateShop (name) {
        game.currentShop = name;
        let finalHtml = '';
        let generator = game.utilities.getGeneratorByName(name);
        finalHtml += generator.generateShopHTML();
        game.utilities.updateText('shop', finalHtml);
    },
	//Buy funcs.
    buyGenerator (name, amount) {
        let generator = game.utilities.getGeneratorByName(name);
        generator.buy(amount);
    },
    buyUpgrade (generatorName, upgrade) {
        let generator = game.utilities.getGeneratorByName(generatorName);
        generator.buyUpgrade(upgrade);
    },
	//Game starter.
    start () {
        // Click spam prevention
        window.addEventListener('keydown', () => {
            if (event.keyCode == 13 || event.keyCode == 32) {
                event.preventDefault();
                return false;
            }
        });

        //Mutation clicking process.
        document.getElementsByClassName('mutationButton')[0].onclick = () => {
            game.player.clickMutation() 
        };

        let localSave = game.saving.getSaveFromCache();
        if (localSave) {
            game.saving.import(localSave);
        } else {
            console.log('No cache save found');
        }

        game.constructShop();
        game.logic();
    }
}

game.start();