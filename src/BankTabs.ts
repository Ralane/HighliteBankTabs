import {Plugin, SettingsTypes} from "@highlite/plugin-api";

export default class ExamplePlugin extends Plugin {
    pluginName = 'Bank Tabs';
    author = '0rangeYouGlad';

    private tabBox: HTMLElement | null = null;
    private resizeListener: (() => void) | null = null;
    private lastQuery: [string] = ['*'];
    private selectedTab = 'All';

    private defaultTabGroups = `{
   "All":[
      "*"
   ]
}`;

    constructor() {
        super();

        this.settings.memory = {
            text: 'Remember selected tab between banking session',
            type: SettingsTypes.checkbox,
            value: false,
            callback: () => {},
        }

        this.settings.hideFromAll = {
            text: 'Hide from All tab when in other tab',
            type: SettingsTypes.checkbox,
            value: true,
            callback: () => {
                this.removeTabBox();
                this.injectTabBox();
            },
        }
    }

    start(): void {
        if (!this.settings.enable.value) {
            return;
        }
        this.injectTabBox();
        this.updateTabBoxVisibility();
    }

    init(): void {
    }

    stop(): void {
        this.destroy();
    }

    BankUIManager_showBankMenu() {
        if (!this.settings.enable.value) {
            return;
        }
        this.injectTabBox();
        this.updateTabBoxVisibility();

        const mainPlayer = document.highlite?.gameHooks?.EntityManager?.Instance?.MainPlayer;
        const bankStorage = mainPlayer.BankStorageItems;

        if (mainPlayer && bankStorage) {
            bankStorage.OnInventoryChangeListener.add(this.updateTab.bind(this));
            bankStorage.OnReorganizedItemsListener.add(this.updateTab.bind(this));
        }
    }

    BankUIManager_handleCenterMenuWillBeRemoved() {
        this.destroy();
    }

    updateTab() {
        this.highlightBankQuery(this.lastQuery)
    }

    updateTabBoxVisibility() {
        const bankMenu = document.getElementById('hs-bank-menu');
        if (!bankMenu) {
            this.removeTabBox();
            return;
        }

        // Check if bank is visible
        const isVisible = this.isBankVisible(bankMenu);

        if (isVisible && !this.tax) {
            this.injectTabBox();
        } else if (!isVisible && this.tabBox) {
            this.removeTabBox();
        }
    }

    isBankVisible(bankMenu: HTMLElement): boolean {
        // Check if the bank menu is visible
        const style = window.getComputedStyle(bankMenu);
        if (style.display === 'none' || style.visibility === 'hidden') {
            return false;
        }

        // Check if parent containers are visible
        let parent = bankMenu.parentElement;
        while (parent) {
            const parentStyle = window.getComputedStyle(parent);
            if (
                parentStyle.display === 'none' ||
                parentStyle.visibility === 'hidden'
            ) {
                return false;
            }
            parent = parent.parentElement;
        }

        // Check if bank menu has any content (indicating it's actually open)
        const hasItems = bankMenu.querySelectorAll('[data-slot]').length > 0;
        return hasItems;
    }

    injectTabBox() {

        if(!this.data.tabGroups) {
            this.data.tabGroups = this.defaultTabGroups;
        }

        // Prevent duplicate injection - check both internal reference and DOM presence
        if (this.tabBox || document.getElementById('bank-tabs'))
            return;

        // Find the bank menu and header
        const bankMenu = document.getElementById('hs-bank-menu');
        if (!bankMenu) return;

        const mainBankItemsBox = document.getElementById('hs-bank-menu__content-container')
        if (!mainBankItemsBox) return;

        // Add highlight style if not present
        if (!document.getElementById('bank-tabs-highlight-style')) {
            const style = document.createElement('style');
            style.id = 'bank-tabs-highlight-style';
            style.textContent = `

/* Style the buttons that are used to open the tab content */
.bank-tab-button {
  float: left;
  // border: solid 2px;
  // border-color: rgb(188, 188, 188);
  padding: 8px 8px;
  transition: 0.3s;
  background-color: rgb(70, 70, 70);
  width: min-content;
  min-width: 60px;
}

/* Change background color of buttons on hover */
.bank-tab-button:hover {
  background-color: rgb(120, 120, 120);
  // border: solid 2px;
  // border-color: rgb(211, 211, 211);
}

.bank-tab-button.dragover {
  background-color: purple;
}

/* Create an active/current tablink class */
.active {
  background-color: rgb(135, 135, 135) !important;
  // border: solid 2px !important;
  // border-color: rgb(222, 222, 222) !important;
}
      `;
            document.head.appendChild(style);
        }


        // Create the tab container
        const tabBox = document.createElement('div');
        tabBox.id = 'bank-tabs';
        tabBox.style.display = 'flex';
        tabBox.style.flexWrap = 'wrap';
        tabBox.style.float = 'left';
        tabBox.style.width = 'inherit';
        tabBox.classList.add('bank-tabs-container');
        this.tabBox = tabBox;

        let tabJson = JSON.parse(`${this.data.tabGroups}`);

        if(!Object.keys(tabJson).includes('All')) {
            this.log("Bank Tabs: Inserted All tab");
            tabJson = {All: ['*'], ...tabJson};
        }

        Object.keys(tabJson).forEach((key) => {
            // Create the tab buttons
            const input = document.createElement('input');
            // const iconSlot = 11 + i;
            // input.innerHTML = `<div id="hs-inventory-item--${iconSlot}" class="hs-inventory-item" draggable="false"><div class="hs-inventory-item__image" style="display: block;padding:24px"></div></div>Tab ${i}`;
            input.value = `${key.trim()}`;
            input.style.flex = 'flex-grow';
            input.id = `bank-tab-id-${key.trim()}`;
            input.maxLength = 0;
            input.size = 1;
            input.classList.add('bank-tab-button');
            input.classList.add('hs-text--white');
            // input.classList.add('hs-text-button hs-text-button-with-bg')

            if(this.settings.memory.value) {
                if(key === this.selectedTab)
                    input.classList.add('active');
            } else {
                if(key === 'All') {
                    input.classList.add('active');
                }
            }


            tabBox.appendChild(input);

            
            // Input event
            input.addEventListener('click', e => {
                this.log(`Bank Tab selected: ${key}`)
                let tabJsonNew = JSON.parse(`${this.data.tabGroups}`);

                const query = tabJsonNew[key];
                this.lastQuery = query; // Store the last query
                this.highlightBankQuery(query);
                this.selectedTab = key;

                let allTabs = document.getElementsByClassName("bank-tab-button");
                for (let b = 0; b < allTabs.length; b++) {
                    if(allTabs[b].id === `bank-tab-id-${this.selectedTab.trim()}`) {
                        allTabs[b].className = `${allTabs[b].className} active`;
                    } else {
                        allTabs[b].className = allTabs[b].className.replace("active", "").replace(" active", "");
                    }
                }
            });

            input.addEventListener("drop", (event) => {
            // prevent default action (open as link for some elements)
            event.preventDefault();
            // this.log(event);
              const data = event.dataTransfer?.getData("text");
                // this.log(data);

                        // Get bank items from the game data
        const bankItems = this.gameHooks.EntityManager.Instance.MainPlayer._bankItems._items || [];

                const itemElement = document.getElementById(data);


                         const bankItem = bankItems[Number(itemElement?.parentElement?.getAttribute('data-slot'))];
            if (!bankItem) {
                return;
            }

            // Get item definition
            const itemDef = document.highlite?.gameHooks?.ItemDefMap?.ItemDefMap
                ?.get
                ? document.highlite.gameHooks.ItemDefMap.ItemDefMap.get(
                      bankItem._id
                  )
                : null;

                const itemId = bankItem._id;
            const itemName = itemDef
                ? itemDef._nameCapitalized ||
                  itemDef._name ||
                  `Item ${bankItem._id}`
                : `Item ${bankItem._id}`;

                this.log(`Dragged ${itemName} ID ${itemId} to tab ${key}`);

                let tabJsonTmp = JSON.parse(`${this.data.tabGroups}`);

                Object.keys(tabJsonTmp).forEach((allKey) => {
                    let index = tabJsonTmp[allKey].indexOf(`${itemId}`);
                    if (index > -1) {
                        this.log(`Removed ${itemName} ID ${itemId} from tab ${allKey}`);
                        tabJsonTmp[allKey].splice(index, 1);
                    }

                    index = tabJsonTmp[allKey].indexOf(`${itemName}`);
                    if (index > -1) {
                        this.log(`Removed ${itemName} ID ${itemId} from tab ${allKey}`);
                        tabJsonTmp[allKey].splice(index, 1);
                    }

                })
                
                if(key !== 'All') {
                    tabJsonTmp[key] = [...(tabJsonTmp[key]), `${itemId}`];
                } else {
                    tabJsonTmp[key] = ['*'];
                }

                // this.log("New JSON: " + JSON.stringify(tabJsonTmp));

                this.data.tabGroups = JSON.stringify(tabJsonTmp);

                const query = tabJsonTmp[this.selectedTab];
                this.lastQuery = query; // Store the last query   
                this.highlightBankQuery(query);          
            });


        });

        // Create the input
        const input = document.createElement('input');
        input.type = 'text';
        input.placeholder = 'Add/Remove Tab';
        input.classList.add('bank-tab-edit-input');
        input.classList.add('hs-text-input');
        input.style.width = '120px'; // Slightly more compact
        input.style.padding = '8px 8px';
        input.style.outline = 'none';
        input.style.float = 'right';
        // input.value = this.settings.memory.value ? this.lastQuery : '';

        // Prevent game from processing keystrokes while typing
        input.addEventListener('keydown', e => e.stopPropagation());
        input.addEventListener('keyup', e => e.stopPropagation());
        input.addEventListener('keypress', e => {
            e.stopPropagation();

            if(e.key === 'Enter') {

                if(!input.value || input.value === "All") {
                    return;
                }
                
                let tabJsonNew = JSON.parse(`${this.data.tabGroups}`);

                if(Object.keys(tabJsonNew).includes(input.value)) {
                    tabJsonNew[input.value] = undefined;
                } else {
                    tabJsonNew[input.value] = [];
                }

                this.data.tabGroups = JSON.stringify(tabJsonNew);
                input.value = "";

                            // const query = input.value.trim().toLowerCase();
            // this.lastQuery = query; // Store the last query
            // this.highlightBankQuery(query);

              this.removeTabBox();
              this.injectTabBox();

            }
        });

        // Add focus styling and prevent focus stealing (matching other plugins)
        input.addEventListener('focus', e => {
            e.preventDefault();
            e.stopPropagation();
        });

        // Prevent focus stealing on mousedown
        input.addEventListener('mousedown', e => {
            e.preventDefault();
            e.stopPropagation();
            input.focus();
        });

        tabBox.appendChild(input);


        // Insert the tab box immediately before the close button
        if (bankMenu) {
            bankMenu.insertBefore(tabBox, mainBankItemsBox);
        }

        // If there is a last query, immediately highlight
        if (this.lastQuery) {
            this.highlightBankQuery(this.lastQuery);
        }
    }

    // In removeTabBox, just remove from DOM (header) and cleanup
    removeTabBox() {
        const existingTabBoxes = document.querySelectorAll('#bank-tabs');
        existingTabBoxes.forEach(box => box.remove());
        this.tabBox = null;
        if (this.resizeListener) {
            window.removeEventListener('resize', this.resizeListener);
            this.resizeListener = null;
        }
    }

    highlightBankQuery(query: [string]) {
        // Get bank items from the game data
        const bankItems = this.gameHooks.EntityManager.Instance.MainPlayer._bankItems._items || [];


        // Find all bank item elements by data-slot attribute
        const bankMenu = document.getElementById('hs-bank-menu');
        if (!bankMenu) return;

        // Query all elements with data-slot attribute
        const itemElements = Array.from(
            bankMenu.querySelectorAll('[data-slot]')
        );

        // If query is *, show all items
        if (query && query.some((s) => s === '*') && !this.settings.hideFromAll.value) {
            itemElements.forEach(el => {
                (el as HTMLElement).style.display = '';
            });
            return;
        }

        // Loop through all itemElements (slots)
        itemElements.forEach((el, i) => {
            const bankItem = bankItems[i];
            if (!bankItem) {
                // No item in this slot, always hide when searching
                (el as HTMLElement).style.display = 'none';
                return;
            }

            // Get item definition
            const itemDef = document.highlite.gameHooks.ItemDefinitionManager._itemDefMap
                ?.get
                ? document.highlite.gameHooks.ItemDefinitionManager._itemDefMap.get(
                      bankItem._id
                  )
                : null;

            const itemName = itemDef
                ? itemDef._nameCapitalized ||
                  itemDef._name ||
                  `Item ${bankItem._id}`
                : `Item ${bankItem._id}`;

            // Handle case for mutually exclusive ALL tab
            if (query && query.some((s) => s === '*') && this.settings.hideFromAll.value) {

                        
                let tabJson = JSON.parse(`${this.data.tabGroups}`);

                let isInOtherTab = false;
                Object.keys(tabJson).forEach((key) => {
                    if(tabJson[key].some((q) => itemName.toLowerCase() === q.trim().toLowerCase() || `${itemDef._id}` === q.trim().toLowerCase())) {
                        isInOtherTab = true;
                    }    
                }
                );

                if(isInOtherTab) {
                    (el as HTMLElement).style.display = 'none';
                } else {
                    (el as HTMLElement).style.display = '';
                }


            } else {
                if (query.some((q) => itemName.toLowerCase() === q.trim().toLowerCase() || `${itemDef._id}` === q.trim().toLowerCase())) {
                    (el as HTMLElement).style.display = '';
                } else {
                    (el as HTMLElement).style.display = 'none';
                }
            }
        });
    }

    // Cleanup method
    destroy(): void {
        const mainPlayer = document.highlite?.gameHooks?.EntityManager?.Instance?.MainPlayer;
        const bankStorage = mainPlayer.BankStorageItems;

        if (mainPlayer && bankStorage) {
            bankStorage.OnInventoryChangeListener.remove(this.updateTab);
            bankStorage.OnReorganizedItemsListener.remove(this.updateTab);
        }
      
        if (!this.settings.memory.value) {
            this.lastQuery = ['*'];
            this.selectedTab = 'All';
        }

        // Find all bank item elements by data-slot attribute
        const bankMenu = document.getElementById('hs-bank-menu');
        if (!bankMenu) return;

        // Query all elements with data-slot attribute
        const itemElements = Array.from(
            bankMenu.querySelectorAll('[data-slot]')
        );

        itemElements.forEach(el => {
            (el as HTMLElement).style.display = ''; // Ensure all items are visible on destroy
        });

        this.removeTabBox();

        // Ensure resize listener is removed
        if (this.resizeListener) {
            window.removeEventListener('resize', this.resizeListener);
            this.resizeListener = null;
        }
    }
}
