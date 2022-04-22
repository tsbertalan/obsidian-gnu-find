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
async function search(base_directory: string, query: string) {

	console.log(`Searching for ${query} in ${base_directory}`);

	
	// Spawn a child process.
	const child = child_process.spawn('/usr/bin/env', [
		'python3',
		'/home/tsbertalan/bin/ffg_onelineperresult.py',
		base_directory,
		query,
		'md'
	]);

	

	// Use async/await to get the results.
	const results = await new Promise((resolve, reject) => {
		// Listen for the 'data' event, and return that from this search function.
		child.stdout.on('data', (data) => {
			// Put the results into the results object.
			resolve(data.toString());
		});
		
		// Listen for the 'error' event, and print it.
		child.on('error', (err) => {
			console.log(err);
			reject(err);
		});

		// Listen for the 'close' event, and resolve the promise.
		child.on('close', () => {
			resolve("");
		});
		
	});

	// Return the results.
	return results;
}


function openFileByPath(app, path: string) {
	// All the markdown files:
	const files = app.vault.getMarkdownFiles();
		
	//Get just the basename of our suggestion path.
	const basename = path2.basename(path);

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
		const ribbonIconEl = this.addRibbonIcon('search', 'GNU Find', (evt: MouseEvent) => {
			// Called when the user clicks the icon.
			new Notice('This is a notice!');
		});
		// Perform additional things with the ribbon
		ribbonIconEl.addClass('my-plugin-ribbon-class');

		// This adds a status bar item to the bottom of the app. Does not work on mobile apps.
		const statusBarItemEl = this.addStatusBarItem();
		statusBarItemEl.setText('Status Bar Text');

		// Search for a fixed string in markdown files.
		this.addCommand({
			id: 'search-markdown',
			name: 'Search with GNU Find',
			callback: () => {

				// new Notice('Searching in markdown files...');

				// Display the SearchQuery.
				new SearchQuery(this.app).open();

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
		contentEl.createEl("p", {text: "Search for a string in titles of markdown files."});
		
		// Make a centered div.
		const centered_holder = contentEl.createEl("center");

		// Make a one-row table with two columns to put the input and the button.
		const table = centered_holder.createEl("table");
		const row = table.createEl("tr");
		const col1 = row.createEl("td");
		// Some spacer columns. I'm really bad at HTML.
		row.createEl("td");
		row.createEl("td");
		row.createEl("td");
		row.createEl("td");
		const col2 = row.createEl("td");

		// Make a text input in the div.
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

		// TODO: Add a checkbox to switch between filenames-only and filenames-and-contents.

		// Add a search button.
		const buttonEl = col2.createEl('button', {
			text: 'Search',
			id: 'search-button',
			type: 'button'
		});
		// buttonEl.setAttribute('type', 'button');
		// buttonEl.setText('Search');
		// buttonEl.setAttribute('id', 'search-button');
		// contentEl.append(buttonEl);

		// Make the button try the search.
		buttonEl.addEventListener('click', () => {
			this.doSearch();
		});
	}

	doSearch() {

		const {contentEl} = this;
		
		// Get the input element, which was appended to the contentEl.
		const query = (contentEl.find('input') as HTMLInputElement).value;
		
		// Only do the search if the query is not empty.
		if (query) {
	
			// Display a notice.
			new Notice(`Searching for "${query}" ...`);
			const base_directory = this.app.vault.adapter.basePath;
	
			// Search for the query.
			// search is an async function, so we need to use a promise.
			search(base_directory, query).then((results) => {
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
		// Remove the final ".md" from the basename.
		const basename_no_ext = basename.substr(0, basename.length - 3);
		el.createEl("div", {text: basename_no_ext});
		// el.createEl("small", {text: suggestion.path});
	}

	onChooseSuggestion(suggestion: SearchResult, evt: MouseEvent | KeyboardEvent) {
		openFileByPath(this.app, suggestion.path);
	}
}
