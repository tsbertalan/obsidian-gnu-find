import {
	App, Editor, MarkdownView, Modal, Notice, Plugin, PluginSettingTab, Setting, SuggestModal 
} from 'obsidian';

const path2 = require('path');

// Load the child_process module.
const child_process = require('child_process');

// Remember to rename these classes and interfaces!

interface MyPluginSettings {
	mySetting: string;
}

const DEFAULT_SETTINGS: MyPluginSettings = {
	mySetting: 'default'
}

// Define a function to do the search.
async function search(base_directory: string, query: string) {

	console.log(`Searching for ${query} in ${base_directory}`);

	
	// Spawn a child process.
	const child = child_process.spawn('/usr/bin/find', [
		base_directory,
		"-iname",
		"*" + query + "*.md",
	]);

	// // Make an object for the callback to put its results into.
	// const results: { [key: string]: string } = {};

	// // Listen for the 'data' event, and return that from this search function.
	// child.stdout.on('data', (data) => {
	// 	// Put the results into the results object.
	// 	results['data'] = data.toString();
	// });

	// Use async/await to get the results.
	const results = await new Promise((resolve, reject) => {
		// Listen for the 'data' event, and return that from this search function.
		child.stdout.on('data', (data) => {
			// Put the results into the results object.
			resolve(data.toString());
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

export default class MyPlugin extends Plugin {
	settings: MyPluginSettings;

	async onload() {
		await this.loadSettings();

		// This creates an icon in the left ribbon.
		const ribbonIconEl = this.addRibbonIcon('dice', 'Sample Plugin', (evt: MouseEvent) => {
			// Called when the user clicks the icon.
			new Notice('This is a notice!');
		});
		// Perform additional things with the ribbon
		ribbonIconEl.addClass('my-plugin-ribbon-class');

		// This adds a status bar item to the bottom of the app. Does not work on mobile apps.
		const statusBarItemEl = this.addStatusBarItem();
		statusBarItemEl.setText('Status Bar Text');

		// // This adds a simple command that can be triggered anywhere
		// this.addCommand({
		// 	id: 'open-sample-modal-simple',
		// 	name: 'Open sample modal (simple)',
		// 	callback: () => {
		// 		new SampleModal(this.app).open();
		// 	}
		// });

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

		// // This adds an editor command that can perform some operation on the current editor instance
		// this.addCommand({
		// 	id: 'sample-editor-command',
		// 	name: 'Sample editor command',
		// 	editorCallback: (editor: Editor, view: MarkdownView) => {
		// 		console.log(editor.getSelection());
		// 		editor.replaceSelection('Sample Editor Command');
		// 	}
		// });
		// // This adds a complex command that can check whether the current state of the app allows execution of the command
		// this.addCommand({
		// 	id: 'open-sample-modal-complex',
		// 	name: 'Open sample modal (complex)',
		// 	checkCallback: (checking: boolean) => {
		// 		// Conditions to check
		// 		const markdownView = this.app.workspace.getActiveViewOfType(MarkdownView);
		// 		if (markdownView) {
		// 			// If checking is true, we're simply "checking" if the command can be run.
		// 			// If checking is false, then we want to actually perform the operation.
		// 			if (!checking) {
		// 				new SampleModal(this.app).open();
		// 			}

		// 			// This command will only show up in Command Palette when the check function returns true
		// 			return true;
		// 		}
		// 	}
		// });

		// // This adds a settings tab so the user can configure various aspects of the plugin
		// this.addSettingTab(new SampleSettingTab(this.app, this));

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

// class SampleModal extends Modal {
// 	constructor(app: App) {
// 		super(app);
// 	}

// 	onOpen() {
// 		const {contentEl} = this;
// 		contentEl.setText('Woah!');
// 	}

// 	onClose() {
// 		const {contentEl} = this;
// 		contentEl.empty();
// 	}
// }

class SearchQuery extends Modal {
	constructor(app: App) {
		super(app);
	}

	onOpen() {
		const {contentEl} = this;
		contentEl.setText('Search for: ');
		// Add an input field. The id will be query-input.
		const inputEl = document.createElement('input');
		inputEl.setAttribute('type', 'text');
		inputEl.setAttribute('placeholder', 'query');
		inputEl.setAttribute('id', 'query-input');
		contentEl.append(inputEl);

		// Put the focus in the input field.
		inputEl.focus();

		// Make the enter key also submit the form.
		inputEl.addEventListener('keydown', (evt: KeyboardEvent) => {
			if (evt.keyCode === 13) {
				this.doSearch();
			}
		});
		
		// Add a search button.
		const buttonEl = document.createElement('button');
		buttonEl.setAttribute('type', 'button');
		buttonEl.setText('Search');
		buttonEl.setAttribute('id', 'search-button');
		contentEl.append(buttonEl);

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
			new Notice(`Searching for "${query}"`);
			const base_directory = this.app.vault.adapter.basePath;
	
			// Search for the query.
			// search is an async function, so we need to use a promise.
			search(base_directory, query).then((results) => {
				// Split the result by newlines.
				const lines = results.split('\n');

				// However, only keep the non-empty lines.
				const nonEmptyLines = lines.filter((line) => line.length > 0);

				// If there are more than one result, launch a GNUSearchResultsModal.
				if (nonEmptyLines.length > 1) {
					new GNUSearchResultsModal(this.app, query, nonEmptyLines).open();
				} else {
					// Otherwise, open the file.
					openFileByPath(this.app, nonEmptyLines[0]);
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
		el.createEl("div", {text: suggestion.path});
	}

	onChooseSuggestion(suggestion: SearchResult, evt: MouseEvent | KeyboardEvent) {
		openFileByPath(this.app, suggestion.path);
	}
}

// class SampleSettingTab extends PluginSettingTab {
// 	plugin: MyPlugin;

// 	constructor(app: App, plugin: MyPlugin) {
// 		super(app, plugin);
// 		this.plugin = plugin;
// 	}

// 	display(): void {
// 		const {containerEl} = this;

// 		containerEl.empty();

// 		containerEl.createEl('h2', {text: 'Settings for my awesome plugin.'});

// 		new Setting(containerEl)
// 			.setName('Setting #1')
// 			.setDesc('It\'s a secret')
// 			.addText(text => text
// 				.setPlaceholder('Enter your secret')
// 				.setValue(this.plugin.settings.mySetting)
// 				.onChange(async (value) => {
// 					console.log('Secret: ' + value);
// 					this.plugin.settings.mySetting = value;
// 					await this.plugin.saveSettings();
// 				}));
// 	}
// }
