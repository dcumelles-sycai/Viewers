import { Meteor } from 'meteor/meteor';
import { Template } from 'meteor/templating';
import { $ } from 'meteor/jquery';
import { _ } from 'meteor/underscore';
import { OHIF } from 'meteor/ohif:core';

Template.hotkeysForm.onCreated(() => {
    const instance = Template.instance();

    instance.api = {
        save() {
            const { contextName } = instance.data;
            const form = instance.$('form').first().data('component');
            const definitions = form.value();
            OHIF.hotkeys.store(contextName, definitions);
        }
    };

    const rg = (start, end) => _.range(start, end + 1);
    instance.allowedKeys = _.union(rg(32, 40), rg(48, 57), rg(65, 90), rg(112, 121), [123]);

    instance.updateInputText = (event, displayPressedKey=false) => {
        const $target = $(event.currentTarget);
        const keysPressedArray = instance.getKeysPressedArray(event);

        if (displayPressedKey) {
            const specialKeyName = jQuery.hotkeys.specialKeys[event.which];
            const keyName = specialKeyName || event.key;
            keysPressedArray.push(keyName.toUpperCase());
        }

        $target.val(keysPressedArray.join('+'));
    };

    instance.getKeysPressedArray = event => {
        const keysPressedArray = [];

        if (event.ctrlKey && !event.altKey) {
            keysPressedArray.push('CTRL');
        }

        if (event.shiftKey && !event.altKey) {
            keysPressedArray.push('SHIFT');
        }

        if (event.altKey && !event.ctrlKey) {
            keysPressedArray.push('ALT');
        }

        return keysPressedArray;
    };

    instance.disallowedCombinations = {
        '': [],
        ALT: ['SPACE'],
        SHIFT: [],
        CTRL: ['F4', 'F5', 'F11', 'W', 'R', 'T', 'O', 'P', 'A', 'S', 'D', 'F', 'G', 'H', 'J', 'L', 'Z', 'X', 'C', 'V', 'B', 'N', 'PAGEDOWN', 'PAGEUP'],
        'CTRL+SHIFT': ['Q', 'W', 'R', 'T', 'P', 'A', 'H', 'V', 'B', 'N']
    };
});

// >>>> REMOVE ME
Meteor.startup(() => {
    OHIF.ui.showDialog('hotkeysDialog', { contextName: 'viewer' });
});

Template.hotkeysForm.events({
    'keydown .hotkey'(event, instance) {
        if (instance.allowedKeys.indexOf(event.keyCode) > -1) {
            instance.updateInputText(event, true);
            $(event.currentTarget).blur();
        } else {
            instance.updateInputText(event);
        }

        event.preventDefault();
    },

    'blur .hotkey'(event, instance) {
        const $target = $(event.currentTarget);
        const combination = $target.val();
        const keys = combination.split('+');
        const lastKey = keys.pop();
        const modifierCombination = keys.join('+');
        const isModifier = ['CTRL', 'ALT', 'SHIFT'].indexOf(lastKey) > -1;
        // Clean the input if left with only a modifier key or browser specific command
        if (isModifier) {
            $target.val('');
        } else if (instance.disallowedCombinations[modifierCombination].indexOf(lastKey) > -1) {
            $target.val('');
            // TODO: show warning
            $target.focus();
        }
    },

    'keyup .hotkey'(event, instance) {
        instance.updateInputText(event);
    }
});

Template.hotkeysForm.helpers({
    getHotkeyInputInformationList() {
        OHIF.context.dep.depend();
        const instance = Template.instance();
        const { contextName } = instance.data;
        const hotkeysInputInformation = [];
        const hotkeysContext = OHIF.hotkeys.getContext(contextName);
        const commandsContext = OHIF.commands.getContext(contextName);
        if (!hotkeysContext || !commandsContext) return hotkeysInputInformation;
        const hotkeyDefinitions = hotkeysContext.definitions;
        _.each(hotkeyDefinitions, (keyCombination, commandName) => {
            const commandDefinitions = commandsContext[commandName];
            if (!commandDefinitions) return;
            hotkeysInputInformation.push({
                key: commandName,
                label: commandDefinitions.name,
                value: keyCombination
            });
        });
        return hotkeysInputInformation;
    }
});
