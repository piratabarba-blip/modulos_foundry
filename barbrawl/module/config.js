import * as api from "./api.js";
import { on, stopEvent } from "./jsUtils.js";
import { getDefaultResources, setDefaultResources } from "./settings.js";

/**
 * Constants to use for rendering the bar configuration from any context.
 */
const configConsts = {
    positions: {
        "top-inner": "barbrawl.position.top-inner",
        "top-outer": "barbrawl.position.top-outer",
        "bottom-inner": "barbrawl.position.bottom-inner",
        "bottom-outer": "barbrawl.position.bottom-outer",
        "left-inner": "barbrawl.position.left-inner",
        "left-outer": "barbrawl.position.left-outer",
        "right-inner": "barbrawl.position.right-inner",
        "right-outer": "barbrawl.position.right-outer",
    },
    styles: {
        user: "barbrawl.textStyle.user",
        none: "barbrawl.textStyle.none",
        fraction: "barbrawl.textStyle.fraction",
        percent: "barbrawl.textStyle.percent"
    }
}

/**
 * Modifies the given HTML to replace the resource bar configuration with our
 *  own template.
 * @param {TokenConfig} tokenConfig The token configuration object.
 * @param {HTMLElement} html The element of the token configuration.
 * @param {Object} data The data of the token configuration.
 */
export const extendTokenConfig = async function (tokenConfig, html, data) {
    const saveEntries = createSaveEntries(tokenConfig);
    const canSaveDefaults = saveEntries.length > 0;
    const loadEntries = createLoadEntries(tokenConfig);
    const canLoadDefaults = loadEntries.length > 0;

    const resourceTab = html.querySelector("div[data-tab='resources']");
    if (!resourceTab) return;

    const controlHtml = await foundry.applications.handlebars.renderTemplate(
        "modules/barbrawl/templates/token-resources.hbs",
        { canSaveDefaults, canLoadDefaults },
    );
    clearNativeBarFields(resourceTab);
    resourceTab.insertAdjacentHTML("beforeend", controlHtml);

    await renderResources(tokenConfig, api.getBars(tokenConfig.token), data.barAttributes);

    tokenConfig.options.actions.addBar = onAddResource;
    tokenConfig.options.actions.deleteBar = onDeleteBar;
    tokenConfig.options.actions.moveBarOut = onMoveBarOut;
    tokenConfig.options.actions.moveBarIn = onMoveBarIn;

    on(resourceTab, "change", "select.brawlbar-attribute", ev => refreshValueInput(tokenConfig.token, ev.delegateTarget, ev));

    if (canSaveDefaults) {
        tokenConfig._createContextMenu(
            () => saveEntries,
            ".brawlbar-save",
            { eventName: "click", hookName: "getBarBrawlSaveMenuEntries", jQuery: false },
        );
    }
    if (canLoadDefaults) {
        tokenConfig._createContextMenu(
            () => loadEntries,
            ".brawlbar-load",
            { eventName: "click", hookName: "getBarBrawlLoadMenuEntries", jQuery: false },
        );
    }
}

/**
 * Renders the given bars into the given token configuration.
 * @param {TokenConfig} config The configuration to render the bars for.
 * @param {object[]} bars The resource bars to render.
 * @param {object[]?} choices The selectable token attributes. May be null to load the attributes from the model.
 * @returns {Promise} A promise representing the rendering process.
 */
async function renderResources(config, bars, choices = null) {
    const parent = config.element.querySelector(".bb-bar-container");
    if (!parent) return;

    const data = prepareContext(config, bars, choices);
    parent.innerHTML = await foundry.applications.handlebars.renderTemplate("modules/barbrawl/templates/bar-config.hbs", data);
    parent.querySelectorAll("select.brawlbar-attribute").forEach(el => refreshValueInput(config.token, el));
    localizeResources(config, parent);
    if (!choices) {
        // Choices aren't set when an inline operation triggers the render.
        config.setPosition();
        const barObj = bars.reduce((obj, bar, index) => {
            bar.order = index;
            obj[bar.id] = bar;
            return obj;
        }, {});
        const previewData = {
            "flags.barbrawl.==resourceBars": barObj,
            bar1: { attribute: null },
            bar2: { attribute: null },
        };
        config._previewChanges(previewData);
    }
}

/**
 * Prepares data required to render resource bars.
 * @param {TokenConfig} config The configuration to prepare the context for.
 * @param {object[]} bars The bars to render.
 * @param {object[]?} choices The selectable token attributes. May be null to load the attributes from the model.
 * @returns
 */
function prepareContext(config, bars, choices = null) {
    if (!choices) {
        const useTrackable = !foundry.utils.isEmpty(CONFIG.Actor.trackableAttributes);
        const source = (config.actor?.system instanceof foundry.abstract.DataModel) && useTrackable
            ? config.actor?.type
            : config.actor?.system;
        const tokenCls = foundry.utils.getDocumentClass("Token");
        const attributes = tokenCls.getTrackedAttributes(source);
        choices = tokenCls.getTrackedAttributeChoices(attributes);
    }

    choices.unshift({ value: "custom", label: "barbrawl.attribute.custom" });
    return {
        constants: configConsts,
        brawlBars: bars,
        bar1Attribute: bars.find(bar => bar.id === "bar1")?.attribute,
        bar2Attribute: bars.find(bar => bar.id === "bar2")?.attribute,
        barAttributes: choices,
        activeBar: config.tabGroups.bars ?? bars[0]?.id,
        activeTab: config.tabGroups.bar ?? "visibility",
    };
}

/**
 * Performs system specific localization for the rendered resources.
 * @param {TokenConfig} config The configuration to localize.
 * @param {HTMLElement} html The HTML containing the resources.
 */
function localizeResources(config, html) {
    if (game.system.id !== "dnd5e") return;

    const sheetClass = CONFIG.Token.sheetClasses.base["dnd5e.TokenConfig5e"]?.cls;
    sheetClass?.prototype._prepareResourceLabels?.call(config, html);
}

/**
 * Removes all bar related form fields from the given tab.
 * @param {HTMLElement} tab The element for the resource tab.
 */
function clearNativeBarFields(tab) {
    const nativeBarFields = [
        tab.querySelector("select[name='displayBars']"),
        tab.querySelector("select[name='bar1.attribute']"),
        tab.querySelector("select[name='bar2.attribute']"),
        ...tab.querySelectorAll("div.bar-data"),
    ];
    nativeBarFields.forEach(el => el.closest("div.form-group").remove());
}

/**
 * Updates the states and values for the current and maximum value inputs.
 * @param {Token} token The token that the bar belongs to.
 * @param {HTMLElement} target The select element that contains the bar's attribute.
 * @param {Event?} event An optional event triggered by changing the target's value.
 */
function refreshValueInput(token, target, event) {
    const barId = target.name.split(".")[3];
    if (!barId) return;

    const form = target.form?.querySelector(`.tab[data-tab="${barId}"]`);
    if (!form) return;

    // Set a hidden attribute input to make sure FoundryVTT doesn't override it with null.
    if (barId === "bar1" || barId === "bar2") {
        const nativeAttributeInput = form.querySelector(`input[name="${barId}.attribute"]`);
        if (nativeAttributeInput) nativeAttributeInput.value = target.value === "custom" ? "" : target.value;
    }

    const valueInput = form.querySelector("input.bar-value");
    const maxInput = form.querySelector("input.bar-max");
    const limitGroup = form.querySelector("input.ignore-limit")?.closest(".form-group");
    if (!valueInput || !maxInput) return;

    if (target.value === "custom") {
        valueInput.removeAttribute("disabled");
        maxInput.removeAttribute("disabled");
        if (event && maxInput.value === "") maxInput.value = valueInput.value;
        limitGroup?.classList.remove("hidden");
    } else {
        valueInput.setAttribute("disabled", "");
        limitGroup?.classList.add("hidden");

        const resource = token.getBarAttribute(null, { alternative: target.value });
        if (resource === null) {
            valueInput.value = maxInput.value = "";
            maxInput.setAttribute("disabled", "");
        } else if (resource.type === "bar") {
            valueInput.value = resource.value;
            maxInput.value = resource.max;
            maxInput.setAttribute("disabled", "");
        } else {
            valueInput.value = resource.value;
            if (event) maxInput.value = "";
            maxInput.removeAttribute("disabled");
        }
    }
}

/**
 * Removes the bar associated with the event's target from the resources.
 * @this {TokenConfig}
 * @param {Event} event The event of the click.
 * @returns {Promise} A promise representing the rendering process.
 */
function onDeleteBar(event) {
    stopEvent(event);
    const { barId } = event.target.dataset;
    const bars = Object.values(getCurrentResources(this)).filter(bar => bar.id !== barId);
    if (this.tabGroups.bars === barId) this.tabGroups.bars = bars[0]?.id;
    return renderResources(this, bars);
}

/**
 * Decreases the order of the bar associated with the event's target by 1 and moves its element accordingly.
 * @this {TokenConfig}
 * @param {Event} event The event of the click.
 * @returns {Promise} A promise representing the rendering process.
 */
function onMoveBarOut(event) {
    stopEvent(event);

    const barId = event.target.closest(".tab[data-group='bars']")?.dataset.tab;
    const bars = Object.values(getCurrentResources(this));
    const index = bars.findIndex(bar => bar.id === barId);
    if (index <= 0) return;

    const swap = bars[index - 1];
    bars[index - 1] = bars[index];
    bars[index] = swap;

    return renderResources(this, bars);
}

/**
 * Increases the order of the bar associated with the event's target by 1 and moves its element accordingly.
 * @this {TokenConfig}
 * @param {Event} event The event of the click.
 * @returns {Promise} A promise representing the rendering process.
 */
function onMoveBarIn(event) {
    stopEvent(event);

    const barId = event.target.closest(".tab[data-group='bars']")?.dataset.tab;
    const bars = Object.values(getCurrentResources(this));
    const index = bars.findIndex(bar => bar.id === barId);
    if (index >= (bars.length - 1)) return;

    const swap = bars[index + 1];
    bars[index + 1] = bars[index];
    bars[index] = swap;

    return renderResources(this, bars);
}

/**
 * Handles an add button click event by adding another resource.
 * @this {TokenConfig}
 * @param {Event} event The event of the button click.
 * @returns {Promise} A promise representing the rendering process.
 */
function onAddResource(event) {
    stopEvent(event);

    const bars = Object.values(getCurrentResources(this));
    const newId = api.getNewBarId(bars);
    const newBar = api.getDefaultBar(newId, "custom");
    bars.push(newBar);
    this.tabGroups.bars = newId;
    return renderResources(this, bars);
}

/**
 * Retrieves the currently rendered resource settings.
 * @param {TokenConfig} app The configuration window containing the resources.
 * @returns {object} An object containing the current resoures.
 */
function getCurrentResources(app) {
    if (!app.element?.length) return {};

    // Parse form data.
    const formData = new foundry.applications.ux.FormDataExtended(app.form);
    const data = app._processFormData(new Event("submit"), app.form, formData);
    return data.flags?.barbrawl?.resourceBars ?? {};
}

/**
 * Creates menu entries for saving the current resource configuration in various locations.
 * @param {TokenConfig} tokenConfig The token configuration to create the entries for.
 * @returns {object[]} An array of menu entries for saving resources.
 */
function createSaveEntries(tokenConfig) {
    let actor = tokenConfig.token.baseActor;
    if (!actor?.isOwner) actor = tokenConfig.token.actor;
    if (!actor) return [];

    const entries = [];
    if (game.user.isGM) {
        entries.push({
            name: "barbrawl.defaults.defaultToken",
            icon: '<i class="fas fa-cogs"></i>',
            callback: () => setDefaultResources(null, getCurrentResources(tokenConfig)),
        });

        const typeLabel = game.i18n.format(
            "barbrawl.defaults.typeDefaults",
            { type: game.i18n.localize(CONFIG.Actor.typeLabels[actor.type]) });
        entries.push({
            name: typeLabel,
            icon: '<i class="fas fa-users"></i>',
            callback: () => setDefaultResources(actor.type, getCurrentResources(tokenConfig), typeLabel),
        });
    }

    if (actor.isOwner && !(tokenConfig.token instanceof foundry.data.PrototypeToken)) {
        const actorLabel = game.i18n.format("barbrawl.defaults.prototypeToken", { name: actor.name });
        entries.push({
            name: actorLabel,
            icon: '<i class="fas fa-user"></i>',
            callback: () => replaceActorResources(actor, getCurrentResources(tokenConfig), actorLabel),
        });
    }

    let tokens = actor.getActiveTokens(false, true).filter(t => t.isOwner && t !== tokenConfig.token);
    if (tokens.length > 1) {
        const tokenLabel = game.i18n.format("barbrawl.defaults.activeTokens", { name: actor.name });
        entries.push({
            name: tokenLabel,
            icon: '<i class="fas fa-user-circle"></i>',
            callback: () => replaceTokenResources(tokens, getCurrentResources(tokenConfig), tokenLabel),
        });
    }

    return entries;
}

/**
 * Replaces the given actor's prototype token resources with the given resource configuration.
 * @param {Actor} actor The actor to store the resources in.
 * @param {object} resources The resource configuration to store.
 * @param {string} label The human readable name of the type setting.
 * @returns {Promise} A promise representing the actor update.
 */
async function replaceActorResources(actor, resources, label) {
    await actor.update({ "prototypeToken.flags.barbrawl.==resourceBars": resources }, { diff: false });
    ui.notifications.info("Bar Brawl | " + game.i18n.format("barbrawl.defaults.saveConfirmation", { target: label }));
}

/**
 * Replaces the resource configuration of the given tokens within the current scene.
 * @param {TokenDocument[]} tokens The tokens to store the resources in.
 * @param {object} resources The resource configuration to store.
 * @param {string} label The human readable name of the type setting.
 * @returns {Promise} A promise representing the scene update.
 */
async function replaceTokenResources(tokens, resources, label) {
    const update = tokens.map(t => ({ _id: t.id, "flags.barbrawl.==resourceBars": resources }));
    await canvas.scene.updateEmbeddedDocuments("Token", update, { diff: false });

    ui.notifications.info("Bar Brawl | " + game.i18n.format("barbrawl.defaults.saveConfirmation", { target: label }));
}

/**
 * Replaces the resource configuration of the given token configuration with the given resources.
 * @param {TokenConfig} app The token configuration to render the entries into.
 * @param {object} resources The resource configuration to render.
 * @returns {Promise} A promise representing the rendering process.
 */
function setCurrentResources(app, resources) {
    const bars = Object.values(resources);
    return renderResources(app, bars);
}

/**
 * Creates menu entries for loading resource configurations stored in various locations.
 * @param {TokenConfig} tokenConfig The token configuration to create the entries for.
 * @returns {object[]} An array of menu entries for loading resources.
 */
function createLoadEntries(tokenConfig) {
    const actor = tokenConfig.token.actor;
    if (!actor) return [];

    const entries = [];
    entries.push({
        name: "barbrawl.defaults.defaultToken",
        icon: '<i class="fas fa-cogs"></i>',
        callback: () => setCurrentResources(tokenConfig, getDefaultResources(null, false)),
    });

    entries.push({
        name: game.i18n.format("barbrawl.defaults.typeDefaults", { type: game.i18n.localize(CONFIG.Actor.typeLabels[actor.type]) }),
        icon: '<i class="fas fa-users"></i>',
        callback: () => setCurrentResources(tokenConfig, getDefaultResources(actor.type, false)),
    });

    if (!(tokenConfig instanceof CONFIG.Token.prototypeSheetClass)) {
        entries.push({
            name: game.i18n.format("barbrawl.defaults.prototypeToken", { name: actor.name }),
            icon: '<i class="fas fa-user"></i>',
            callback: () => setCurrentResources(tokenConfig, actor.prototypeToken.flags?.barbrawl?.resourceBars ?? {}),
        });
    }

    return entries;
}
