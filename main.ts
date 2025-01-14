import {
	App, Editor, MarkdownView, Modal, Notice, Plugin, PluginSettingTab, Setting, SuggestModal 
} from 'obsidian';

const path2 = require('path');

// Load the child_process module.
const child_process = require('child_process');


interface GNUFindSettings {
	mySetting: string;
}


const DEFAULT_SETTINGS: GNUFindSettings = {
	mySetting: 'default'
}


// Define a function to do the search.
async function search(base_directory: string, query: string, full_text: boolean=true) {

	console.log(`Searching for ${query} in ${base_directory}`);
	
	// Spawn a child process to search for markdown files.
	var child;
	if (full_text) {
		child = child_process.spawn('/usr/bin/env', [
			'python3',
			'/home/tsbertalan/bin/ffg_onelineperresult.py',
			base_directory,
			query,
			'md'
		]);
	} else {
		child = child_process.spawn('/usr/bin/find', [
			base_directory,
			'-type', 'f',
			'-iname', `*${query}*.md`
		]);
	}
    
    // Spawn another non-full-text search to find PDFs searching only file names.
    var child2 = child_process.spawn('/usr/bin/find', [
        base_directory,
        '-type', 'f',
        '-iname', `*${query}*.pdf`
    ]);


	// Use async/await to get the results.
	const results = await new Promise((resolve, reject) => {

        var child_1_resolved = false;
        var child_2_resolved = false;
        var multiline_data = '';
        
        function maybe_resolve() {
            if (child_1_resolved && child_2_resolved) {
                // If both children have resolved, resolve this promise.
                if (multiline_data.length > 0) {
                    // If the length of the multiline_data string is 0, don't slice.
                    resolve(multiline_data);
                } else {
                    // Otherwise, remove the guaranteed newline at the end.
                    resolve(multiline_data.slice(0, -1));
                }
            }
        }

		// Listen for the 'data' events, and return that from this search function.
		child.stdout.on('data', (data) => {
            multiline_data += data.toString() + '\n';
            child_1_resolved = true;

            maybe_resolve();
		});

        child2.stdout.on('data', (data) => {
            multiline_data += data.toString() + '\n';
            child_2_resolved = true;

            maybe_resolve();
        });
		
		// Listen for the 'error' events, and print it.
		child.on('error', (err) => {
			console.log(err);
			reject(err);
		});
        child2.on('error', (err) => {
            console.log(err);
            reject(err);
        });

		// Listen for the 'close' events, and resolve the promise.
		child.on('close', () => {
            child_1_resolved = true;
            maybe_resolve();
		});
        child2.on('close', () => {
            child_2_resolved = true;
            maybe_resolve();
        });

	});

    // Return the results.
    return results;
}


function openFileByPath(app, path: string) {
	// All the markdown files:
	//const files = app.vault.getMarkdownFiles();
	const files = app.vault.getFiles();

	//Get just the basename of our suggestion path.
	const basename = path2.basename(path);

    // Log what we're looking for.
    console.log(`Looking for "${basename}" in ${files.length} files.`);

	// Filter for files whose "path" matches our "basename".
	const filtered = files.filter((file) => {
		return file.path.endsWith(basename);
	});
	
	// If we got more than zero results, make a leaf with the first.
	if (filtered.length > 0) {
		const tfile = filtered[0];
		// Create a leaf with this file.
		const leaf = app.workspace.getLeaf(true);
		leaf.openFile(tfile);
	} else {
		new Notice(`Couldn't find selected file ${basename} in the vault.`);
	}
}



export default class GNUFind extends Plugin {
	settings: GNUFindSettings;

	async onload() {
		await this.loadSettings();

		// This creates an icon in the left ribbon.
		this.addRibbonIcon('search', 'GNU Find', (evt: MouseEvent) => {
			new SearchQuery(this.app).open();
		});

		this.addRibbonIcon('yesterday-glyph', 'Add Day Links', (evt: MouseEvent) => {
			child_process.spawn('/home/tsbertalan/bin/add_day_links', []);
		});

		// Search for a fixed string in markdown files.
		this.addCommand({
			id: 'search-markdown',
			name: 'Search with GNU Find',
			callback: () => {
				new SearchQuery(this.app).open();
			}
		});

		// Run some other no-input scripts I want to use from Obsidian frequently.
		this.addCommand({
			id: 'add-day-links',
			name: 'Add day links',
			callback: () => {
				child_process.spawn('/home/tsbertalan/bin/add_day_links', []);
			}
		});
		// If the plugin hooks up any global DOM events (on parts of the app that doesn't belong to this plugin)
		// Using this function will automatically remove the event listener when this plugin is disabled.
		this.registerDomEvent(document, 'click', (evt: MouseEvent) => {
			console.log('click', evt);
		});

		// When registering intervals, this function will automatically clear the interval when the plugin is disabled.
		this.registerInterval(window.setInterval(() => console.log('setInterval'), 5 * 60 * 1000));
	}

	onunload() {

	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}


class SearchQuery extends Modal {
	constructor(app: App) {
		super(app);
	}

	onOpen() {
		const {contentEl} = this;
		const checked_text   = "Search for a string in titles and contents of markdown files and titles of PDFs.";
		const unchecked_text = "Search for a string in titles of markdown and PDF files.";

		// Give the contentEl a minimum width.
		contentEl.setAttribute('style', 'min-width: 600px;');

		var instructions_p = contentEl.createEl("p", {
			text: checked_text
		});
		// Use a centered style	
		instructions_p.setAttribute('style', 'text-align: center;');
		
		// Make a centered div.
		const centered_holder = contentEl.createEl("center");

		// Make a one-row table with some columns to put the input, checkbox, and button.
		const table = centered_holder.createEl("table");
		const row = table.createEl("tr");
		const col1 = row.createEl("td");
		col1.setAttribute('style', 'padding: 10px;');
		const col2 = row.createEl("td");
		col2.setAttribute('style', 'padding: 10px;');
		const col3 = row.createEl("td");
		col3.setAttribute('style', 'padding: 10px;');


		// Make a text input.
		const inputEl = col1.createEl('input', {
			type: 'text',
			placeholder: 'query',
			id: 'query-input'
		});
		// Put the focus in the input field.
		inputEl.focus();
		// Make the enter key also submit the form.
		inputEl.addEventListener('keydown', (evt: KeyboardEvent) => {
			if (evt.keyCode === 13) {
				this.doSearch();
			}
		});


		// Add a checkbox for full-search text.
		const full_search_checkbox = col2.createEl('input', {
			type: 'checkbox',
			id: 'full-search-checkbox',
		});
		full_search_checkbox.setAttribute('style', 'vertical-align: text-top;')
		// Make switching the checkbox change the instructions text.
		full_search_checkbox.addEventListener('change', (evt: Event) => {
			if (full_search_checkbox.checked) {
				instructions_p.innerText = checked_text;
			} else {
				instructions_p.innerText = unchecked_text;
			}
		});
		full_search_checkbox.setAttribute('checked', true)
		col2.createEl('label', {
			text: 'Full text?',
			for: 'full-search-checkbox',
		});


		// Add a search button.
		const buttonEl = col3.createEl('button', {
			text: 'Search',
			id: 'search-button',
			type: 'button'
		});
		// Make the button try the search.
		buttonEl.addEventListener('click', () => {
			const full_search = full_search_checkbox.checked;
			this.doSearch(full_search);
		});
	}
	
	doSearch(full_search: boolean = true) {
		
		const {contentEl} = this;
		
		// Get the user inputs.
		const query = (contentEl.find('input') as HTMLInputElement).value;
		
		// Only do the search if the query is not empty.
		if (query) {
	
			// Display a notice.
			new Notice(`Searching for "${query}" ...`);
			const base_directory = this.app.vault.adapter.basePath;
	
			// Search for the query.
			// search is an async function, so we need to use a promise.
			search(base_directory, query, full_search).then((results) => {
				// Split the result by newlines.
				const lines = results.split('\n');

				// However, only keep the non-empty lines.
				const nonEmptyLines = lines.filter((line) => line.length > 0);

				// If there are more than one result, launch a GNUSearchResultsModal.
				console.log(`Found ${nonEmptyLines.length} results for "${query}".`);
				new Notice(`Found ${nonEmptyLines.length} results for "${query}".`);
				if (nonEmptyLines.length > 1) {
					new GNUSearchResultsModal(this.app, query, nonEmptyLines).open();
				} else {
					// If there is only one result, open the file.
					if (nonEmptyLines.length === 1) {
						openFileByPath(this.app, nonEmptyLines[0]);
					} else {
						// If there are no results, display a notice.
						console.log(`No results for "${query}"`);
					}
				}
			});

		} else {
			new Notice('Please enter a query.');
		}

		this.close();
	}

	onClose() {
		const {contentEl} = this;
		contentEl.empty();
	}

}


interface SearchResult {
	path: string;
}


class GNUSearchResultsModal extends SuggestModal<SearchResult> {

	constructor(app: App, actual_query: string, results: string[]) {
		super(app);
		this.results = results;
		this.setPlaceholder(`Showing results below for "${actual_query}".`);
	}

	getSuggestions(ignored_query: string) {
		// Create a list of SearchResult objects.
		const suggestions = this.results.map((result) => {
			return {
				path: result
			};
		});
		return suggestions;
	}

	renderSuggestion(suggestion: SearchResult, el: HTMLElement) {
		const basename = path2.basename(suggestion.path);
        var basename_fixed;
		// If the lowercase filename ends in ".md", remove the final ".md" from the basename.
        if (basename.toLowerCase().endsWith('.md')) {
            basename_fixed = basename.slice(0, -3);
        } else {
            basename_fixed = basename;
        }
		el.createEl("div", {text: basename_fixed});
		// el.createEl("small", {text: suggestion.path});
	}

	onChooseSuggestion(suggestion: SearchResult, evt: MouseEvent | KeyboardEvent) {
		openFileByPath(this.app, suggestion.path);
	}
}
