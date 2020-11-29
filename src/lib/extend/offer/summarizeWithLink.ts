/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */

import { TradeOffer } from 'steam-tradeoffer-manager';
import { Currency } from '../../../types/TeamFortress2';
import { UnknownDictionary } from '../../../types/common';
import SchemaManager from 'tf2-schema-2';

import Currencies from 'tf2-currencies';
import SKU from 'tf2-sku-2';

export = function (schema: SchemaManager.Schema): string {
    const self = this as TradeOffer;

    const value: { our: Currency; their: Currency } = self.data('value');

    const items: {
        our: UnknownDictionary<any>;
        their: UnknownDictionary<any>;
    } = self.data('dict') || { our: null, their: null };

    if (!value) {
        return (
            'Asked: ' +
            summarizeItemsWithLink(items.our, schema) +
            '\nOffered: ' +
            summarizeItemsWithLink(items.their, schema)
        );
    } else {
        return (
            'Asked: ' +
            new Currencies(value.our).toString() +
            ' (' +
            summarizeItemsWithLink(items.our, schema) +
            ')\nOffered: ' +
            new Currencies(value.their).toString() +
            ' (' +
            summarizeItemsWithLink(items.their, schema) +
            ')'
        );
    }
};

function summarizeItemsWithLink(dict: UnknownDictionary<any>, schema: SchemaManager.Schema): string {
    if (dict === null) {
        return 'unknown items';
    }

    const summary: string[] = [];

    for (const sku in dict) {
        if (!Object.prototype.hasOwnProperty.call(dict, sku)) {
            continue;
        }

        const amount = dict[sku]['amount'];
        const name = schema
            .getName(SKU.fromString(sku), false)
            .replace(/Non-Craftable/g, 'NC')
            .replace(/Professional Killstreak/g, 'Pro KS')
            .replace(/Specialized Killstreak/g, 'Spec KS')
            .replace(/Killstreak/g, 'KS');

        summary.push(
            '[' + name + '](https://www.prices.tf/items/' + sku + ')' + (amount > 1 ? ` x${amount as number}` : '')
        );
    }

    if (summary.length === 0) {
        return 'nothing';
    }

    let left = 0;

    if (summary.length > 15) {
        left = summary.length - 15;
        summary.splice(15);
    }

    return summary.join(', ') + (left !== 0 ? ` and ${left}` + ' more items.' : '');
}
