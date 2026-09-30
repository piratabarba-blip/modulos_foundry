import { clampBarValue, convertBarVisibility, getDefaultBar } from "./api.js";

/**
 * Prepares the update of a token (or a prototype token) by removing invalid
 *  resources and synchronizing with FoundryVTT's resource format.
 * @param {TokenDocument} tokenDoc The data to merge the new data into.
 * @param {Object} newData The data to be merged into the token data.
 */
export const prepareUpdate = function (tokenDoc, newData) {
    const changedBars = foundry.utils.getProperty(newData, "flags.barbrawl.resourceBars");
    const replaceBars = foundry.utils.getProperty(newData, "flags.barbrawl.replaceBars");
    if (changedBars) {
        const existingBars = foundry.utils.getProperty(tokenDoc._source, "flags.barbrawl.resourceBars") ?? {};
        for (let barId of Object.keys(changedBars)) {
            // Remove bars that were explicitly set to "None" attribute.
            const bar = changedBars[barId];
            if (bar === _del) continue; // Already queued for removal

            // Remove bars without attribute.
            if (bar.attribute === "") {
                delete newData[barId];
                changedBars[barId] = _del;
                continue;
            }

            // Validate update.
            const barData = existingBars[barId];
            if (!bar.id && !barData?.id) {
                console.warn("Bar Brawl | Skipping invalid bar update. This may indicate a compatibility issue.");
                delete changedBars[barId];
                continue;
            }

            convertBarVisibility(bar);
            clampBarValue(bar, barData);
        }

        if (replaceBars) {
            // Remove bars that are no longer present in the configuration.
            for (let barId of Object.keys(existingBars)) {
                if (changedBars[barId] || newData[barId]?.attribute) continue;
                changedBars[barId] = _del;
            }
        }
    } else if (replaceBars) {
        // Clear all bar data.
        foundry.utils.setProperty(newData, "flags.barbrawl.resourceBars", _replace({}));
        newData.bar1 = { attribute: null };
        newData.bar2 = { attribute: null };
    }

    delete newData.flags?.barbrawl?.replaceBars;
    synchronizeUpdate(tokenDoc._source, newData);
}

/**
 * Prepares creation data for a (prototype) token by synchronizing with FoundryVTT's resource format.
 * @param {TokenDocument} tokenDoc The token to prepare.
 */
export function prepareCreation(tokenDoc) {
    const data = tokenDoc._source;
    const brawlBars = foundry.utils.getProperty(data, "flags.barbrawl.resourceBars");
    if (brawlBars) {
        ["bar1", "bar2"].forEach(barId => {
            const attribute = brawlBars[barId]?.attribute;
            tokenDoc.updateSource({
                [barId + ".attribute"]: (!attribute || attribute === "custom") ? null : attribute
            });
        });
    } else {
        const brawlBars = {};
        if (data.bar1?.attribute) brawlBars.bar1 = getDefaultBar("bar1", data.bar1.attribute, data.displayBars);
        if (data.bar2?.attribute) brawlBars.bar2 = getDefaultBar("bar1", data.bar2.attribute, data.displayBars);
        tokenDoc.updateSource({ "flags.barbrawl.resourceBars": _replace(brawlBars) });
    }

    // Always make the bar container visible.
    if (data.displayBars !== CONST.TOKEN_DISPLAY_MODES.ALWAYS) {
        tokenDoc.updateSource({ displayBars: CONST.TOKEN_DISPLAY_MODES.ALWAYS });
    }
}

/**
 * Synchronizes resource bars to and from FoundryVTT's format with Bar Brawl.
 * @param {object} tokenData The data to merge the new data into.
 * @param {object} newData The data to be merged into the token data.
 */
function synchronizeUpdate(tokenData, newData) {
    const hasLegacyBars = newData.hasOwnProperty("bar1") || newData.hasOwnProperty("bar2");
    const hasBrawlBars = foundry.utils.hasProperty(newData, "flags.barbrawl.resourceBars");

    if (hasBrawlBars) {
        synchronizeBrawlBar("bar1", newData);
        synchronizeBrawlBar("bar2", newData);
    }

    if (hasLegacyBars) {
        if (!hasBrawlBars) foundry.utils.setProperty(newData, "flags.barbrawl.resourceBars", {});

        synchronizeLegacyBar("bar1", tokenData, newData);
        synchronizeLegacyBar("bar2", tokenData, newData);
    }

    // Ensure that the bar container stays visible.
    if (tokenData.displayBars !== CONST.TOKEN_DISPLAY_MODES.ALWAYS) {
        newData.displayBars = CONST.TOKEN_DISPLAY_MODES.ALWAYS;
    } else {
        delete newData.displayBars;
    }
}

/**
 * Merges the state of a changed Bar Brawl resource bar into FoundryVTT.
 * @param {String} barId The name of the bar to synchronize.
 * @param {Object} newData The data to be merged into the token data.
 */
function synchronizeBrawlBar(barId, newData) {
    let brawlBarData = newData.flags.barbrawl.resourceBars[barId];
    if (brawlBarData?.attribute) {
        newData[barId] = { attribute: brawlBarData.attribute === "custom" ? null : brawlBarData.attribute };
    } else if (brawlBarData === _del) {
        newData[barId] = { attribute: null };
    }
}

/**
 * Merges the state of a changed FoundryVTT resource bar with Bar Brawl.
 * @param {String} barId The name of the bar to synchronize.
 * @param {Object} tokenData The data to merge the new data into.
 * @param {Object} newData The data to be merged into the token data.
 */
function synchronizeLegacyBar(barId, tokenData, newData) {
    const foundryBarData = newData[barId];
    if (!foundryBarData) return;

    const brawlBars = foundry.utils.getProperty(tokenData, "flags.barbrawl.resourceBars") ?? {};
    const brawlBarChanges = newData.flags.barbrawl.resourceBars;
    if (brawlBarChanges[barId] === _del) return; // Already queued for removal.

    const brawlBarData = brawlBars[barId];
    // Partial updates (including light/effect updates) need not contain bar flags.
    // A custom bar is represented by a null native attribute, not a deletion.
    const attribute = brawlBarChanges[barId]?.attribute ?? brawlBarData?.attribute;
    if (foundryBarData.attribute === null && attribute === "custom") return;
    // Native value-only updates must not erase the configured resource path.
    if (Object.keys(foundryBarData).length && !Object.hasOwn(foundryBarData, "attribute")) return;
    const remove = Object.keys(foundryBarData).length === 0 || foundryBarData.attribute === null;

    if (brawlBarData) {
        if (remove) {
            // Remove the bar
            brawlBarChanges[barId] = _del;
        } else {
            // Change the attribute
            foundry.utils.setProperty(brawlBarChanges, barId + ".attribute", foundryBarData.attribute);
        }
    } else if (!remove) {
        // Create a new bar with default values
        brawlBarChanges[barId] ??= getDefaultBar(barId, foundryBarData.attribute, tokenData.displayBars);
    }
}
