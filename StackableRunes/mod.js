const SINGLE_ITEM_CODE = 'rune';
const STACK_ITEM_CODE = 'runs';

const ITEM_TYPES = [];
function converItemTypeToStackItemType(itemtype) {
  if (itemtype != null && ITEM_TYPES.indexOf(itemtype) !== -1) {
    return itemtype.replace(/^r/, 's');
  }
  return itemtype;
}

const miscFilenames = [];

const itemsFilename = 'hd\\items\\items.json';
const items = D2RMM.readJson(itemsFilename);
const newItems = [...items];
for (const index in items) {
  const item = items[index];
  for (const itemtype in item) {
    const asset = item[itemtype].asset;
    if (asset.startsWith(`${SINGLE_ITEM_CODE}/`) && !asset.endsWith('_stack')) {
      ITEM_TYPES.push(itemtype);
      const itemtypeStack = converItemTypeToStackItemType(itemtype);
      newItems.push({ [itemtypeStack]: { asset: `${asset}_stack` } });
      miscFilenames.push(asset.replace(`${SINGLE_ITEM_CODE}/`, ''));
    }
  }
}
D2RMM.writeJson(itemsFilename, newItems);

const miscDirFilename = `hd\\items\\misc\\${SINGLE_ITEM_CODE}\\`;
for (const index in miscFilenames) {
  const miscFilename = `${miscDirFilename + miscFilenames[index]}.json`;
  const miscStackFilename = `${
    miscDirFilename + miscFilenames[index]
  }_stack.json`;
  const miscStack = D2RMM.readJson(miscFilename);
  D2RMM.writeJson(miscStackFilename, miscStack);
}

const itemtypesFilename = 'global\\excel\\itemtypes.txt';
const itemtypes = D2RMM.readTsv(itemtypesFilename);
itemtypes.rows.forEach((itemtype) => {
  if (itemtype.Code === SINGLE_ITEM_CODE) {
    itemtypes.rows.push({
      ...itemtype,
      ItemType: `${itemtype.ItemType} Stack`,
      Code: STACK_ITEM_CODE,
      Equiv1: 'misc',
      AutoStack: 1,
    });
  }
});
D2RMM.writeTsv(itemtypesFilename, itemtypes);

const treasureclassexFilename = 'global\\excel\\treasureclassex.txt';
const treasureclassex = D2RMM.readTsv(treasureclassexFilename);
treasureclassex.rows.forEach((treasureclass) => {
  treasureclass.Item1 = converItemTypeToStackItemType(treasureclass.Item1);
  treasureclass.Item2 = converItemTypeToStackItemType(treasureclass.Item2);
});
D2RMM.writeTsv(treasureclassexFilename, treasureclassex);

const miscFilename = 'global\\excel\\misc.txt';
const misc = D2RMM.readTsv(miscFilename);
misc.rows.forEach((item) => {
  if (ITEM_TYPES.indexOf(item.code) !== -1) {
    misc.rows.push({
      ...item,
      name: `${item.name} Stack`,
      compactsave: 0,
      type: STACK_ITEM_CODE,
      code: converItemTypeToStackItemType(item.code),
      stackable: 1,
      minstack: 1,
      maxstack: 500,
      spawnstack: 1,
    });
    item.spawnable = 0;
  }
});
D2RMM.writeTsv(miscFilename, misc);

const cubemainFilename = 'global\\excel\\cubemain.txt';
const cubemain = D2RMM.readTsv(cubemainFilename);
for (let i = 0; i < ITEM_TYPES.length; i += 1) {
  const itemtype = ITEM_TYPES[i];
  const stacktype = converItemTypeToStackItemType(itemtype);
  // convert from single to stack
  cubemain.rows.push({
    description: `${itemtype} -> ${stacktype}`,
    enabled: 1,
    version: 100,
    numinputs: 1,
    'input 1': itemtype,
    output: stacktype,
    '*eol': 0,
  });
  // convert from stack to single
  cubemain.rows.push({
    description: `${stacktype} -> ${itemtype}`,
    enabled: 1,
    version: 100,
    op: 18, // skip recipe if item's Stat.Accr(param) != value
    param: 70, // quantity (itemstatcost.txt)
    value: 1, // only execute rule if quantity == 1
    numinputs: 1,
    'input 1': stacktype,
    output: itemtype,
    '*eol': 0,
  });
}

// if another mod already added destacking, don't add it again
if (
  cubemain.rows.find(
    (row) => row.description === 'Stack of 2 -> Stack of 1 and Stack of 1'
  ) == null
) {
  for (let i = 2; i <= 500; i += 1) {
    cubemain.rows.push({
      description: `Stack of ${i} -> Stack of ${i - 1} and Stack of 1`,
      enabled: 1,
      version: 0,
      op: 18, // skip recipe if item's Stat.Accr(param) != value
      param: 70, // quantity (itemstatcost.txt)
      value: i, // only execute rule if quantity == i
      numinputs: 1,
      'input 1': 'misc',
      output: `"usetype,qty=${i - 1}"`,
      'output b': `"usetype,qty=1"`,
      '*eol': 0,
    });
  }
}
D2RMM.writeTsv(cubemainFilename, cubemain);

// D2R colors runes as orange by default, but it seems to be based on item type
// rather than localization strings so it does not apply to the stacked versions
// we update the localization file to manually color the names of runes here
// so that it will also apply to the stacked versions of the runes
const itemRunesFilename = 'local\\lng\\strings\\item-runes.json';
const itemRunes = D2RMM.readJson(itemRunesFilename);
itemRunes.forEach((item) => {
  const itemtype = item.Key;
  if (itemtype.match(/^r[0-9]{2}$/) != null) {
    // update all localizations
    for (const key in item) {
      if (key !== 'id' && key !== 'Key') {
        item[key] = `ÿc8${item[key]}`;
      }
    }
  }
});
D2RMM.writeJson(itemRunesFilename, itemRunes);

D2RMM.copyFile(
  'hd', // <mod folder>\hd
  'hd', // <diablo 2 folder>\mods\<modname>\<modname>.mpq\data\hd
  true // overwrite any conflicts
);
