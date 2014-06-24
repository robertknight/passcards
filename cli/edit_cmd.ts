import argparse = require('argparse');
import Q = require('q');

export interface CommandHandler {
	handle(args: any) : Q.Promise<void>;
}

export class EditCommand {
	parser: argparse.ArgumentParser;

	constructor(cmd: argparse.Subparsers) {
		this.parser = cmd.addParser('edit', {
			description: 'Edit an existing item in the vault'
		});
		this.parser.addArgument(['item'], {
			action: 'store',
			help: 'Pattern specifying the items'
		});
		var editCmds = this.parser.addSubparsers({dest:'action'});

		// commands for adding sections and fields
		var addSectionCmd = editCmds.addParser('add-section');
		addSectionCmd.addArgument(['section']);

		var addFieldCmd = editCmds.addParser('add-field');
		addFieldCmd.addArgument(['section']);
		addFieldCmd.addArgument(['field']);
		addFieldCmd.addArgument(['-t', '--type'], {
			action: 'store',
			nargs: 1,
			dest: 'type',
			help: 'Type of data for this item',
			choices: ['text', 'password', 'email']
		});

		// commands for updating sections and fields
		var renameSectionCmd = editCmds.addParser('rename-section');
		renameSectionCmd.addArgument(['section']);
		renameSectionCmd.addArgument(['new_name']);

		var setFieldCmd = editCmds.addParser('set-field');
		setFieldCmd.addArgument(['field']);

		var renameFieldCmd = editCmds.addParser('rename-field');
		renameFieldCmd.addArgument(['field']);
		renameFieldCmd.addArgument(['new_name']);

		// commands for removing sections and fields
		var removeSectionCmd = editCmds.addParser('remove-section');
		removeSectionCmd.addArgument(['section']);

		var removeFieldCmd = editCmds.addParser('remove-field');
		removeFieldCmd.addArgument(['field']);
	}

	handle(args: any) : Q.Promise<void> {
		switch (args.action) {
			case 'add-section':
				return this.addSection(args.section);
			case 'add-field':
				return this.addField(args.section, args.field);
			case 'rename-section':
				return this.renameSection(args.section, args.new_name);
			case 'set-field':
				return this.setField(args.field, args.value);
			case 'rename-field':
				return this.renameField(args.field, args.new_name);
			case 'remove-section':
				return this.removeSection(args.section);
			case 'remove-field':
				return this.removeField(args.field);
		}
	}

	private addSection(section: string) : Q.Promise<void> {
		return Q.reject(null);
	}

	private addField(section: string, field: string) : Q.Promise<void> {
		return Q.reject(null);
	}

	private renameSection(section: string, newName: string) : Q.Promise<void> {
		return Q.reject(null);
	}

	private setField(field: string, newValue: string) : Q.Promise<void> {
		return Q.reject(null);
	}

	private renameField(field: string, newName: string) : Q.Promise<void> {
		return Q.reject(null);
	}

	private removeSection(section: string) : Q.Promise<void> {
		return Q.reject(null);
	}

	private removeField(field: string) : Q.Promise<void> {
		return Q.reject(null);
	}
}
