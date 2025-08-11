import { Plugin, SettingsTypes } from "@highlite/plugin-api";

export default class BankTabs extends Plugin {
    pluginName = "Bank Tabs";
    author = "0rangeYouGlad";

    private tabBox: HTMLElement | null = null;
    private lastQuery: [string] = ["*"];
    private selectedTab = "All";
    private resizeListener: ResizeObserver | null = null;
    private defaultTabGroups = `{
   "All":[
      "*"
   ]
}`;

    constructor() {
        super();

        this.settings.memory = {
            text: "Remember selected tab between banking session",
            type: SettingsTypes.checkbox,
            value: false,
            callback: () => {},
        };

        this.settings.hideFromAll = {
            text: "All tab excludes other tab contents",
            type: SettingsTypes.checkbox,
            value: true,
            callback: () => {
                this.removeTabBox();
                this.injectTabBox();
                this.updateTab();
            },
        };

        this.settings.grayOut = {
            text: "Gray Out items instead of hiding",
            type: SettingsTypes.checkbox,
            value: false,
            callback: () => {
                this.removeTabBox();
                this.injectTabBox();
                this.updateTab();
            },
        };

        this.settings.mutuallyExclusiveTabs = {
            text: "Mutually Exclusive Tabs (uncheck to allow items in multiple tabs)",
            type: SettingsTypes.checkbox,
            value: true,
            callback: () => {
                this.removeTabBox();
                this.injectTabBox();
                this.updateTab();
            },
        };

        this.settings.allowResize = {
            text: "Resizeable Tabs",
            type: SettingsTypes.checkbox,
            value: false,
            callback: () => {
                this.removeTabBox();
                this.injectTabBox();
                this.updateTab();
            },
        };

        this.settings.allowAddRemove = {
            text: "Show Add/Remove Control",
            type: SettingsTypes.checkbox,
            value: true,
            callback: () => {
                this.removeTabBox();
                this.injectTabBox();
                this.updateTab();
            },
        };

        this.settings.showTabReordering = {
            text: "Show Reordering Controls",
            type: SettingsTypes.checkbox,
            value: false,
            callback: () => {
                this.removeTabBox();
                this.injectTabBox();
                this.updateTab();
            },
        };

        this.settings.bankTabColor = {
            text: "Inactive Bank Tab Color",
            type: SettingsTypes.color,
            value: "#464646",
            callback: () => {
                this.removeTabBox();
                this.injectTabBox();
                this.updateTab();
            },
        };

        this.settings.bankTabColorActive = {
            text: "Active Bank Tab Color",
            type: SettingsTypes.color,
            value: "#d3d3d3",
            callback: () => {
                this.removeTabBox();
                this.injectTabBox();
                this.updateTab();
            },
        };

        this.settings.bankTabColorHovered = {
            text: "Hovered Bank Tab Color",
            type: SettingsTypes.color,
            value: "#787878ff",
            callback: () => {
                this.removeTabBox();
                this.injectTabBox();
                this.updateTab();
            },
        };

        this.settings.bankTabColorActive = {
            text: "Active Bank Tab Color",
            type: SettingsTypes.color,
            value: "#878787ff",
            callback: () => {
                this.removeTabBox();
                this.injectTabBox();
                this.updateTab();
            },
        };

        this.settings.bankTabPaddingWidth = {
            text: "Tab Padding Width",
            type: SettingsTypes.range,
            value: 8,
            callback: () => {
                this.removeTabBox();
                this.injectTabBox();
                this.updateTab();
            },
        };

        this.settings.bankTabPaddingHeight = {
            text: "Tab Padding Height",
            type: SettingsTypes.range,
            value: 8,
            callback: () => {
                this.removeTabBox();
                this.injectTabBox();
                this.updateTab();
            },
        };
    }

    start(): void {
        if (!this.settings.enable.value) {
            return;
        }
        this.injectTabBox();
        this.updateTabBoxVisibility();
    }

    init(): void {}

    stop(): void {
        this.destroy();
    }

    BankUIManager_showBankMenu() {
        if (!this.settings.enable.value) {
            return;
        }

        this.injectTabBox();
        this.updateTabBoxVisibility();

        const mainPlayer =
            document.highlite?.gameHooks?.EntityManager?.Instance?.MainPlayer;
        const bankStorage = mainPlayer.BankStorageItems;

        if (mainPlayer && bankStorage) {
            bankStorage.OnInventoryChangeListener.add(
                this.updateTab.bind(this),
            );
            bankStorage.OnReorganizedItemsListener.add(
                this.updateTab.bind(this),
            );
        }
    }

    BankUIManager_handleCenterMenuWillBeRemoved() {
        this.destroy();
    }

    updateTab() {
        this.highlightBankQuery(this.lastQuery);
    }

    saveTabWidths() {
        if (!this.data.savedTabWidths) {
            this.data.savedTabWidths = {};
        }

        // Find all bank item elements by data-slot attribute
        const bankMenu = document.getElementById("hs-bank-menu");
        if (!bankMenu) return;

        const tabElements = Array.from(
            bankMenu.querySelectorAll(".bank-tab-button"),
        );

        tabElements.forEach((tab) => {
            this.log(
                "Tab " +
                    tab.value +
                    " + " +
                    (tab as HTMLElement).parentElement?.scrollWidth,
            );
            var tabText = tab.value;
            if (tabText) {
                this.data.savedTabWidths[tabText] = (
                    tab as HTMLElement
                ).parentElement?.scrollWidth;
            }
        });
    }

    updateTabBoxVisibility() {
        const bankMenu = document.getElementById("hs-bank-menu");
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
        if (style.display === "none" || style.visibility === "hidden") {
            return false;
        }

        // Check if parent containers are visible
        let parent = bankMenu.parentElement;
        while (parent) {
            const parentStyle = window.getComputedStyle(parent);
            if (
                parentStyle.display === "none" ||
                parentStyle.visibility === "hidden"
            ) {
                return false;
            }
            parent = parent.parentElement;
        }

        // Check if bank menu has any content (indicating it's actually open)
        const hasItems = bankMenu.querySelectorAll("[data-slot]").length > 0;
        return hasItems;
    }

    applyStyling() {
        let styleText = `

/* Style the buttons that are used to open the tab content */
.bank-tab-button {
  float: left;
  padding: ${this.settings.bankTabPaddingHeight.value}px ${this.settings.bankTabPaddingWidth.value}px;
  transition: 0.3s;
  background-color: ${this.settings.bankTabColor.value};
}

/* Change background color of buttons on hover */
.bank-tab-button:hover {
  background-color: ${this.settings.bankTabColorHovered.value};
}

.bank-tab-button:dragover {
    background-color: ${this.settings.bankTabColorHovered.value};
}

/* Create an active/current tablink class */
.active {
  background-color: ${this.settings.bankTabColorActive.value} !important;
}

.bank-helper-greyed-out {
    opacity: 0.3 !important;
    filter: grayscale(100%) !important;
    transition: opacity 0.2s, filter 0.2s;
}
      `;

        let style = document.getElementById("bank-tabs-highlight-style");

        // Add highlight style if not present
        if (!style) {
            style = document.createElement("style");
            style.id = "bank-tabs-highlight-style";
            style.textContent = styleText;
            document.head.appendChild(style);
        } else {
            style.textContent = styleText;
        }
    }

    injectTabBox() {
        if (!this.data.tabGroups) {
            this.data.tabGroups = this.defaultTabGroups;
        }

        if (!this.data.tabOrdering) {
            this.data.tabOrdering = [];
        }

        this.resizeListener = new ResizeObserver(() => {
            this.saveTabWidths();
            this.log("Size changed");
        });

        this.applyStyling();

        // Prevent duplicate injection - check both internal reference and DOM presence
        if (this.tabBox || document.getElementById("bank-tabs")) return;

        // Find the bank menu and header
        const bankMenu = document.getElementById("hs-bank-menu");
        if (!bankMenu) return;

        const mainBankItemsBox = document.getElementById(
            "hs-bank-menu__content-container",
        );
        if (!mainBankItemsBox) return;

        // Create the tab container
        const tabBox = document.createElement("div");
        tabBox.id = "bank-tabs";
        tabBox.style.display = "flex";
        tabBox.style.flexWrap = "wrap";
        tabBox.style.float = "left";
        tabBox.style.width = "inherit";
        tabBox.classList.add("bank-tabs-container");
        this.tabBox = tabBox;

        let tabJson = JSON.parse(`${this.data.tabGroups}`);

        if (!Object.keys(tabJson).includes("All")) {
            this.log("Bank Tabs: Inserted All tab");
            tabJson = { All: ["*"], ...tabJson };
        }

        Object.keys(tabJson).forEach((key) => {
            if (!this.data.tabOrdering.includes(key)) {
                this.data.tabOrdering.push(key);
            }
        });

        this.data.tabOrdering.forEach((key) => {
            const inputDiv = document.createElement("div");
            inputDiv.style.flex = "flex-grow";
            if (this.settings.allowResize.value) {
                inputDiv.style.resize = "horizontal";
            }
            inputDiv.style.overflow = "auto";
            inputDiv.style.minWidth = "60px";
            inputDiv.classList.add("hs-text--white");

            if (this.data.savedTabWidths && this.data.savedTabWidths[key]) {
                inputDiv.style.width = `${this.data.savedTabWidths[key]}px`;
            }

            // Create the tab buttons
            const input = document.createElement("input");
            // const iconSlot = 11 + i;
            // input.innerHTML = `<div id="hs-inventory-item--${iconSlot}" class="hs-inventory-item" draggable="false"><div class="hs-inventory-item__image" style="display: block;padding:24px"></div></div>Tab ${i}`;
            input.value = `${key.trim()}`;
            input.style.flex = "flex-grow";
            input.id = `bank-tab-id-${key.trim()}`;
            input.maxLength = 0;
            input.classList.add("bank-tab-button");
            input.classList.add("hs-text--white");
            input.style.width = "-webkit-fill-available";
            input.size = 1;
            // input.classList.add('hs-text-button hs-text-button-with-bg')

            if (this.settings.memory.value) {
                if (key === this.selectedTab) input.classList.add("active");
            } else {
                if (key === "All") {
                    input.classList.add("active");
                }
            }

            if (this.settings.showTabReordering.value) {
                const keyIndex = this.data.tabOrdering.indexOf(key);

                const reorderContainer = document.createElement("div");
                reorderContainer.style.backgroundColor = `${this.settings.bankTabColor.value}`;
                reorderContainer.style.width = "auto";
                reorderContainer.style.display = "flex";

                if (keyIndex > 0) {
                    const inputLeftButton = document.createElement("button");
                    inputLeftButton.innerText = "<";
                    inputLeftButton.style.backgroundColor = `${this.settings.bankTabColorHovered.value}`;
                    inputLeftButton.style.minWidth = "20px";
                    inputLeftButton.style.flexGrow = "1";
                    // inputXButton.style.position = "fixed";

                    inputLeftButton.addEventListener("click", (e) => {
                        var temp =
                            this.data.tabOrdering[
                                this.data.tabOrdering.indexOf(key) - 1
                            ];
                        this.data.tabOrdering[keyIndex - 1] = key;
                        this.data.tabOrdering[keyIndex] = temp;

                        this.removeTabBox();
                        this.injectTabBox();
                    });

                    reorderContainer.appendChild(inputLeftButton);
                }

                if (keyIndex < this.data.tabOrdering.length - 1) {
                    const inputRightButton = document.createElement("button");
                    inputRightButton.innerText = ">";
                    inputRightButton.style.backgroundColor = `${this.settings.bankTabColorHovered.value}`;
                    inputRightButton.style.minWidth = "20px";
                    inputRightButton.style.flexGrow = "1";

                    inputRightButton.addEventListener("click", (e) => {
                        var temp =
                            this.data.tabOrdering[
                                this.data.tabOrdering.indexOf(key) + 1
                            ];
                        this.data.tabOrdering[keyIndex + 1] = key;
                        this.data.tabOrdering[keyIndex] = temp;

                        this.removeTabBox();
                        this.injectTabBox();
                    });

                    reorderContainer.appendChild(inputRightButton);
                }

                if (key !== "All") {
                    const inputXButton = document.createElement("button");
                    inputXButton.innerText = "X";
                    inputXButton.style.minWidth = "20px";
                    inputXButton.style.maxWidth = "20px";
                    inputXButton.style.background = "red";
                    inputXButton.style.float = "right";
                    inputXButton.style.flexGrow = "0";

                    inputXButton.addEventListener("click", (e) => {
                        let tabJsonNew = JSON.parse(`${this.data.tabGroups}`);

                        if (Object.keys(tabJsonNew).includes(key)) {
                            tabJsonNew[key] = undefined;
                        }
                        this.data.savedTabWidths[key] = undefined;
                        const tabOrderingIndex =
                            this.data.tabOrdering.indexOf(key);
                        if (tabOrderingIndex > -1) {
                            this.data.tabOrdering.splice(tabOrderingIndex, 1);
                        }

                        this.data.tabGroups = JSON.stringify(tabJsonNew);
                        this.removeTabBox();
                        this.injectTabBox();
                    });
                    reorderContainer.appendChild(inputXButton);
                }

                inputDiv.appendChild(reorderContainer);
            }

            inputDiv.appendChild(input);
            tabBox.appendChild(inputDiv);

            this.resizeListener.observe(inputDiv);

            // Input event
            input.addEventListener("click", (e) => {
                this.log(`Bank Tab selected: ${key}`);
                let tabJsonNew = JSON.parse(`${this.data.tabGroups}`);

                const query = tabJsonNew[key];
                this.lastQuery = query; // Store the last query
                this.highlightBankQuery(query);
                this.selectedTab = key;

                let allTabs =
                    document.getElementsByClassName("bank-tab-button");
                for (let b = 0; b < allTabs.length; b++) {
                    if (
                        allTabs[b].id ===
                        `bank-tab-id-${this.selectedTab.trim()}`
                    ) {
                        allTabs[b].className = `${allTabs[b].className} active`;
                    } else {
                        allTabs[b].className = allTabs[b].className
                            .replace("active", "")
                            .replace(" active", "");
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
                const bankItems =
                    this.gameHooks.EntityManager.Instance.MainPlayer._bankItems
                        ._items || [];

                if (!data) {
                    return;
                }
                const itemElement = document.getElementById(data);

                const bankItem =
                    bankItems[
                        Number(
                            itemElement?.parentElement?.getAttribute(
                                "data-slot",
                            ),
                        )
                    ];
                if (!bankItem) {
                    return;
                }

                // Get item definition
                const itemDef = document.highlite?.gameHooks?.ItemDefMap
                    ?.ItemDefMap?.get
                    ? document.highlite.gameHooks.ItemDefMap.ItemDefMap.get(
                          bankItem._id,
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

                if (this.settings.mutuallyExclusiveTabs.value) {
                    Object.keys(tabJsonTmp).forEach((allKey) => {
                        let index = tabJsonTmp[allKey].indexOf(`${itemId}`);
                        if (index > -1) {
                            this.log(
                                `Removed ${itemName} ID ${itemId} from tab ${allKey}`,
                            );
                            tabJsonTmp[allKey].splice(index, 1);
                        }

                        index = tabJsonTmp[allKey].indexOf(`${itemName}`);
                        if (index > -1) {
                            this.log(
                                `Removed ${itemName} ID ${itemId} from tab ${allKey}`,
                            );
                            tabJsonTmp[allKey].splice(index, 1);
                        }
                    });
                } else {
                    // When not mutually exclusive, only remove from current tab if dragged into "All" or own tab.
                    if (key === "All" || key === this.selectedTab) {
                        let index = tabJsonTmp[this.selectedTab].indexOf(
                            `${itemId}`,
                        );
                        if (index > -1) {
                            this.log(
                                `Removed ${itemName} ID ${itemId} from tab ${this.selectedTab}`,
                            );
                            tabJsonTmp[this.selectedTab].splice(index, 1);
                        }
                    }
                }

                if (key !== "All") {
                    tabJsonTmp[key] = [...tabJsonTmp[key], `${itemId}`];
                } else {
                    tabJsonTmp[key] = ["*"];
                }

                // this.log("New JSON: " + JSON.stringify(tabJsonTmp));

                this.data.tabGroups = JSON.stringify(tabJsonTmp);

                const query = tabJsonTmp[this.selectedTab];
                this.lastQuery = query; // Store the last query
                this.highlightBankQuery(query);
            });
        });

        if (this.settings.allowAddRemove.value) {
            // Create the input
            const input = document.createElement("input");
            input.type = "text";
            input.placeholder = "Add/Remove Tab";
            input.classList.add("bank-tab-edit-input");
            input.classList.add("hs-text-input");
            input.style.width = "120px"; // Slightly more compact
            input.style.padding = `${this.settings.bankTabPaddingHeight.value}px ${this.settings.bankTabPaddingWidth.value}px`;
            input.style.outline = "none";
            input.style.float = "right";
            // input.value = this.settings.memory.value ? this.lastQuery : '';

            // Prevent game from processing keystrokes while typing
            input.addEventListener("keydown", (e) => e.stopPropagation());
            input.addEventListener("keyup", (e) => e.stopPropagation());
            input.addEventListener("keypress", (e) => {
                e.stopPropagation();

                if (e.key === "Enter") {
                    if (!input.value || input.value === "All") {
                        return;
                    }

                    let tabJsonNew = JSON.parse(`${this.data.tabGroups}`);

                    if (Object.keys(tabJsonNew).includes(input.value)) {
                        tabJsonNew[input.value] = undefined;
                        this.data.savedTabWidths[input.value] = undefined;
                        const tabOrderingIndex = this.data.tabOrdering.indexOf(
                            input.value,
                        );
                        if (tabOrderingIndex > -1) {
                            this.data.tabOrdering.splice(tabOrderingIndex, 1);
                        }
                    } else {
                        tabJsonNew[input.value] = [];
                    }

                    if (input.value === this.selectedTab) {
                        this.selectedTab = "All";
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
            input.addEventListener("focus", (e) => {
                e.preventDefault();
                e.stopPropagation();
            });

            // Prevent focus stealing on mousedown
            input.addEventListener("mousedown", (e) => {
                e.preventDefault();
                e.stopPropagation();
                input.focus();
            });

            tabBox.appendChild(input);
        }

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
        const existingTabBoxes = document.querySelectorAll("#bank-tabs");
        existingTabBoxes.forEach((box) => box.remove());
        this.tabBox = null;
        if (this.resizeListener) {
            window.removeEventListener("resize", this.resizeListener);
            this.resizeListener = null;
        }
    }

    highlightBankQuery(query: [string]) {
        // Get bank items from the game data
        const bankItems =
            this.gameHooks.EntityManager.Instance.MainPlayer._bankItems
                ._items || [];

        // Find all bank item elements by data-slot attribute
        const bankMenu = document.getElementById("hs-bank-menu");
        if (!bankMenu) return;

        // Query all elements with data-slot attribute
        const itemElements = Array.from(
            bankMenu.querySelectorAll("[data-slot]"),
        );

        // If query is *, show all items
        if (
            query &&
            query.some((s) => s === "*") &&
            !this.settings.hideFromAll.value
        ) {
            itemElements.forEach((el) => {
                (el as HTMLElement).style.display = "";
                el.classList.remove("bank-helper-greyed-out");
            });
            return;
        }

        // Loop through all itemElements (slots)
        itemElements.forEach((el, i) => {
            const bankItem = bankItems[i];
            if (!bankItem) {
                // No item in this slot, always hide when searching
                if (this.settings.grayOut.value) {
                    el.classList.add("bank-helper-greyed-out");
                } else {
                    (el as HTMLElement).style.display = "none";
                }
                return;
            }

            // Get item definition
            const itemDef = document.highlite.gameHooks.ItemDefinitionManager
                ._itemDefMap?.get
                ? document.highlite.gameHooks.ItemDefinitionManager._itemDefMap.get(
                      bankItem._id,
                  )
                : null;

            const itemName = itemDef
                ? itemDef._nameCapitalized ||
                  itemDef._name ||
                  `Item ${bankItem._id}`
                : `Item ${bankItem._id}`;

            // Handle case for mutually exclusive ALL tab
            if (
                this.settings.hideFromAll.value &&
                query &&
                query.some((s) => s === "*")
            ) {
                let tabJson = JSON.parse(`${this.data.tabGroups}`);

                let isInOtherTab = false;
                Object.keys(tabJson).forEach((key) => {
                    if (
                        tabJson[key] &&
                        tabJson[key].some(
                            (q) =>
                                itemName.toLowerCase() ===
                                    q.trim().toLowerCase() ||
                                `${itemDef._id}` === q.trim().toLowerCase(),
                        )
                    ) {
                        isInOtherTab = true;
                    }
                });

                if (isInOtherTab) {
                    if (this.settings.grayOut.value) {
                        el.classList.add("bank-helper-greyed-out");
                    } else {
                        (el as HTMLElement).style.display = "none";
                    }
                } else {
                    (el as HTMLElement).style.display = "";
                    el.classList.remove("bank-helper-greyed-out");
                }
            } else {
                if (
                    query &&
                    query.some(
                        (q) =>
                            itemName.toLowerCase() === q.trim().toLowerCase() ||
                            `${itemDef._id}` === q.trim().toLowerCase(),
                    )
                ) {
                    (el as HTMLElement).style.display = "";
                    el.classList.remove("bank-helper-greyed-out");
                } else {
                    if (this.settings.grayOut.value) {
                        el.classList.add("bank-helper-greyed-out");
                    } else {
                        (el as HTMLElement).style.display = "none";
                    }
                }
            }
        });
    }

    // Cleanup method
    destroy(): void {
        const bankMenu = document.getElementById("hs-bank-menu");
        if (!bankMenu) return;
        const itemElements = Array.from(
            bankMenu.querySelectorAll("[data-slot]"),
        );
        itemElements.forEach((el) => {
            (el as HTMLElement).style.display = ""; // Ensure all items are visible on destroy
            el.classList.remove("bank-helper-greyed-out");
        });

        if (!this.settings.memory.value) {
            this.lastQuery = ["*"];
            this.selectedTab = "All";
        }

        const mainPlayer =
            document.highlite?.gameHooks?.EntityManager?.Instance?.MainPlayer;
        const bankStorage = mainPlayer.BankStorageItems;
        if (bankStorage) {
            bankStorage.OnInventoryChangeListener.remove(this.updateTab);
            bankStorage.OnReorganizedItemsListener.remove(this.updateTab);
        }

        this.removeTabBox();
    }
}
