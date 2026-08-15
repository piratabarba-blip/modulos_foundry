/**
 * This is the entry file for the FoundryVTT module to configure resource bars.
 * @author Adrian Haberecht
 */

import { extendBarRenderer } from "./module/rendering.js";
import { extendTokenConfig } from "./module/config.js";
import { extendTokenHud } from "./module/hud.js";
import { getDefaultResources, registerSettings } from "./module/settings.js";
import { prepareCreation, prepareUpdate } from "./module/synchronization.js";
import * as api from "./module/api.js";
import { adjustPrototypeOverrides } from "./module/prototypeOverrides.js";

/** Hook to register settings. */
Hooks.once('init', function () {
    console.log('Bar Brawl | Initializing barbrawl');
    game.modules.get("barbrawl").api = window.BarBrawlApi = {
        getBars: api.getBars,
        getBar: api.getBar,
        isBarVisible: api.isBarVisible,
        getActualBarValue: api.getActualBarValue,
        getDefaultBars: getDefaultResources
    };

    registerSettings();

    foundry.applications.handlebars.loadTemplates(["modules/barbrawl/templates/bar-config.hbs"]);
});
Hooks.once("ready", adjustPrototypeOverrides);

/** Hooks to change UI elements. */
Hooks.once("setup", extendBarRenderer);
Hooks.on("renderTokenHUD", extendTokenHud);
Hooks.on("renderTokenApplication", extendTokenConfig);

/** Hook to remove bars and synchronize legacy bars. */
Hooks.on("preUpdateToken", function (doc, changes) {
    prepareUpdate(doc, changes);
});

/** Hook to make sure that bars are rendered when any changes are made. */
Hooks.on("updateToken", function (doc, changes) {
    if (foundry.utils.hasProperty(changes, "flags.barbrawl.resourceBars")) {
        doc.object.renderFlags.set({ refreshBars: true });
    }
});

Hooks.on("updateActor", function (actor, changes, context, userId) {
    if (!changes.system) return;

    const tokens = actor.getDependentTokens({ scenes: canvas.scene });
    for (const tokenDoc of tokens) {
        const barData = tokenDoc.getFlag("barbrawl", "resourceBars");
        if (!barData) continue;

        const barAttributes = Object.values(barData).reduce((attributes, bar) => {
            // Filter native bars as they will be handled by TokenDocument._onRelatedUpdate.
            if (bar.id !== "bar1" && bar.id !== "bar2") attributes.push(bar.attribute);
            return attributes;
        }, []);
        if (barAttributes.some(attr => foundry.utils.hasProperty(changes.system, attr))) {
            tokenDoc.object.renderFlags.set({ refreshBars: true });
        }
    }
});

/** Hook to apply changes to the prototype token. */
Hooks.on("preUpdateActor", function (actor, newData) {
    if (newData.prototypeToken) prepareUpdate(actor.prototypeToken, newData.prototypeToken);
});

Hooks.on("preCreateActor", function (doc) {
    if (doc._stats?.createdTime) return; // Actor is a copy, don't touch it.
    if (!doc.prototypeToken) return;

    const barConfig = getDefaultResources(doc.type) ?? getDefaultResources();
    if (barConfig) doc.updateSource({ "prototypeToken.flags.barbrawl.resourceBars": _replace(barConfig) });

    prepareCreation(doc.prototypeToken);
});

/** Hook to update bar visibility. */
Hooks.on("hoverToken", api.refreshBarVisibility);
Hooks.on("controlToken", api.refreshBarVisibility);
Hooks.on("createCombatant", function (combatant) {
    const token = combatant.token?.object;
    if (token) api.refreshBarVisibility(token);
});
Hooks.on("deleteCombatant", function (combatant) {
    const token = combatant.token?.object;
    if (token) api.refreshBarVisibility(token);
})