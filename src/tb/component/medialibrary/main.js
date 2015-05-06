/*
 * To change this template, choose Tools | Templates
 * and open the template in the editor.
 */
require.config({
    paths: {
        'mediaFolder.datastore': 'src/tb/component/medialibrary/datastore/mediaFolder.datastore',
        'media.datastore': 'src/tb/component/medialibrary/datastore/media.datastore',
        'mediaFolder.contextMenuHelper': 'src/tb/component/medialibrary/helpers/contextmenu.helper',
        'mediaItem.renderer': 'src/tb/component/medialibrary/helpers/mediaitemrenderer.helper'
    }
});
define(
    [
        'require',
        'Core',
        'component!popin',
        'component!treeview',
        'component!dataview',
        'component!rangeselector',
        'jquery',
        'text!tb.component/medialibrary/templates/layout.tpl',
        'nunjucks',
        'BackBone',
        'mediaItem.renderer',
        'component!searchengine',
        'mediaFolder.datastore',
        'media.datastore',
        'mediaFolder.contextMenuHelper',
        'media.datastore',
        'component!mask',
        "jsclass",
        "component!pagination",
        "component!notify",
        "component!jquery-layout"
    ],
    function (
        require,
        Core,
        PopInMng,
        TreeView,
        DataViewMng,
        RangeSelector,
        jQuery,
        layout,
        nunjucks,
        BackBone,
        ItemRenderer
    ) {

        'use strict';
        var defaultConfig = {
                autoDisplay: true,
                viewmode: 'grid',
                dialogConfig: {
                    title: "Media library",
                    draggable: false,
                    resizable: false,
                    autoOpen: false,
                    height: jQuery(window).height() - (20 * 2),
                    width: jQuery(window).width() - (20 * 2)
                },
                rangeSelector: {
                    range: [10, 50, 10],
                    selected: 10
                },
                mode: 'edit',
                searchEngine: {},
                mediaView: {
                    allowMultiSelection: true,
                    selectedItemCls: "selected",
                    css: {
                        width: "auto",
                        height: "auto"
                    }
                },
                resetOnClose: true,
                mediaFolderTreeView: {}
            },
            trans = require("Core").trans || function (value) {return value; },
            MediaLibrary = new JS.Class({
                VIEW_MODE: 'view',
                EDIT_MODE: 'edit',
                initialize: function (config) {
                    jQuery.extend(this, {}, BackBone.Events);
                    this.config = config || {};

                    this.resetOnClose = this.config.resetOnClose || false;
                    this.dialog = this.initPopin();
                    this.dialog.addOption("open", jQuery.proxy(this.onOpen, null, this));
                    this.dialog.addOption("close", jQuery.proxy(this.onClose, this, this));
                    this.dialog.addOption("focus", jQuery.proxy(this.onFocus, this));
                    this.widget = jQuery(nunjucks.renderString(layout, {}));
                    this.handleViewModeChange();
                    this.loadingMap = {};
                    this.openedMediaFolder = null;
                    this.mediaItemRenderer = new ItemRenderer();
                    this.mediaItemRenderer.setSelector(this);
                    this.loadedNode = null;
                    this.initComponents();
                    this.setMode(this.config.mode);
                },

                handleViewModeChange: function (e) {
                    this.widget.find(".viewmode-btn").removeClass("active");
                    if (!e) {
                        this.widget.find(".viewmode-btn.bb5-sortas" + this.config.viewmode).addClass("active");
                    } else {
                        var viewmode = jQuery(e.currentTarget).data('viewmode');
                        this.mediaListView.setRenderMode(viewmode);
                        jQuery(e.currentTarget).addClass("active");
                    }
                },

                onFocus: function () {
                    this.trigger("focus"); //useful for child popin
                },

                onClose: function () {
                    if (this.config.mode === this.EDIT_MODE) {
                        this.trigger("close", this.mediaListView.getSelection());
                    }
                    if (this.resetOnClose) {
                        this.reset();
                    }
                    this.triggerEvent = true;
                },

                reset: function () {
                    this.mediaListView.reset();
                    this.mediaPagination.setItems(0);
                    this.rangeSelector.reset();
                    jQuery(this.widget).find(".result-infos").html("");
                    this.mediaFolderTreeView.unselectNode();
                },

                setMode: function (mode) {
                    if (this.config.mode === this.EDIT_MODE) {
                        this.addButtons();
                        this.resetOnClose = true; //force reset
                    }
                    this.mediaItemRenderer.setMode(mode);
                    /* edit mode */
                },

                getAvailableMedia: function () {
                    return this.config.available_media;
                },

                selectItems: function (media) {
                    this.mediaListView.selectItems(media);
                },

                addButtons: function () {
                    var self = this;
                    this.dialog.addButton("Add & Close", function () {
                        self.triggerEvent = true;
                        self.close();
                    });
                    this.dialog.addButton("Cancel", function () {
                        self.triggerEvent = false;
                        self.close();
                    });

                    jQuery("#" + this.dialog.getId() + " .ui-dialog-buttonset").addClass("pull-right");
                },

                initLayouts: function () {
                    this.widgetLayout = jQuery(this.widget).layout({
                        applyDefaultStyles: true,
                        closable: false,
                        west__childOptions: {
                            center__paneSelector: ".inner-center",
                            north__paneSelector: ".ui-layout-north",
                            south__paneSelector: ".ui-layout-south"
                        },
                        center__childOptions: {
                            center__paneSelector: ".inner-center.data-list-ctn",
                            north__paneSelector: ".ui-layout-north"
                        }
                    });
                    this.widgetLayout.resizeAll();
                    this.widgetLayout.sizePane("west", 235);
                },

                fixDataviewLayout: function (top) {
                    if (!this.widgetLayout) {
                        return;
                    }
                    top = top || 170;
                    var resizerTop = top - 5;
                    jQuery(this.widgetLayout.center.children.layout1.resizers.north).css('top', resizerTop);
                    jQuery(this.widgetLayout.center.children.layout1.center.pane).css('top', top);
                },

                initComponents: function () {
                    this.mediaFolderDataStore = require("mediaFolder.datastore");
                    this.mediaDataStore = require('media.datastore');
                    this.maskMng = require('component!mask').createMask({});
                    this.mediaFolderTreeView = this.createMediaFolderView();
                    this.mediaListView = this.createMediaListView();
                    this.maskMng = require('component!mask').createMask({});
                    this.contextMenuHelper = require('mediaFolder.contextMenuHelper');
                    this.contextMenuHelper.setMainWidget(this);
                    this.rangeSelector = this.createRangeSelector(this.config.rangeSelector);
                    this.searchEngine = this.createSearchEngine(this.config.searchEngine);
                    this.mediaDataStore.setLimit(this.rangeSelector.getValue());
                    this.mediaPagination = require("component!pagination").createPagination(this.config.pagination);
                    this.mediaPagination.setItemsOnPage(this.rangeSelector.getValue(), true);
                    this.mainZone = jQuery(this.widget).find('.bb5-windowpane-main').eq(0);
                },

                toggleMask: function () {
                    if (this.maskMng.hasMask(this.mainZone)) {
                        this.maskMng.unmask(this.mainZone);
                    } else {
                        this.maskMng.mask(this.mainZone);
                    }
                },

                unmask: function (container) {
                    this.maskMng.unmask(container);
                },

                handleTreeMask: function (action) {
                    if (action === "show") {
                        this.maskMng.mask(this.treeContainer);
                    }
                    if (action === "remove") {
                        if (this.maskMng.hasMask(this.treeContainer)) {
                            this.maskMng.unmask(this.treeContainer);
                        }
                    }
                },

                createMediaFolderView: function () {
                    return TreeView.createTreeView(this.config.mediaFolderTreeView);
                },

                createRangeSelector: function () {
                    return RangeSelector.createPageRangeSelector(this.config.rangeSelector);
                },

                createSearchEngine: function (config) {
                    return require('component!searchengine').createSimpleSearchEngine(config);
                },

                createMediaListView: function () {
                    var mediaViewConfig = this.config.mediaView;
                    if (this.config.hasOwnProperty("viewmode")) {
                        mediaViewConfig.renderMode = this.config.viewmode;
                    }
                    mediaViewConfig.itemRenderer = jQuery.proxy(this.mediaItemRenderer.render, this.mediaItemRenderer);
                    mediaViewConfig.dataStore = this.mediaDataStore;
                    return DataViewMng.createDataView(mediaViewConfig);
                },

                onSaveHandler: function (mediaItem, data) {
                    mediaItem.title = data.title;
                    this.mediaDataStore.save(mediaItem);
                },

                deleteMedia: function (media) {
                    var self = this;
                    this.mediaDataStore.remove(media).done(function () {
                        self.mediaDataStore.execute();
                        self.mediaItemRenderer.hidePopin();
                    });
                },

                hideEditForm: function () {
                    if (this.mediaEditorDialog) {
                        this.mediaEditorDialog.hide();
                    }
                },

                validationHandler: function (form, data) {
                    if (!data.hasOwnProperty('title') || data.title.trim().length === 0) {
                        form.addError('title', trans('the_title_field_is_required'));
                    }
                },

                showMediaEditForm: function (type, mediaItem) {
                    try {
                        var self = this,
                            content = null,
                            mediaInfos;
                        require("Core").ApplicationManager.invokeService('content.main.edition').done(function (deps) {

                            if (mediaItem) {
                                content = deps.ContentHelper.buildElement(mediaItem.content);
                                mediaInfos = {
                                    id: mediaItem.id,
                                    uid: mediaItem.id,
                                    content_uid: mediaItem.content.uid,
                                    type: mediaItem.content.type,
                                    folder_uid: self.loadedNode.uid
                                };
                                deps.EditionHelper.show(content, {
                                    onValidate: jQuery.proxy(self.validationHandler, self),
                                    onSave: jQuery.proxy(self.onSaveHandler, self, mediaInfos)
                                });
                                /* deal with main dialog getting focus while editing */
                                self.dialog.addChild(deps.EditionHelper.getDialog());
                                self.mediaEditorDialog = deps.EditionHelper.getDialog();
                            } else {
                                deps.ContentHelper.createElement(type).done(function (content) {
                                    mediaInfos = {
                                        content_uid: content.uid,
                                        type: content.type,
                                        folder_uid: self.loadedNode.uid
                                    };
                                    deps.EditionHelper.show(content, {
                                        onSave: jQuery.proxy(self.onSaveHandler, self, mediaInfos),
                                        onValidate: jQuery.proxy(self.validationHandler, self)
                                    });
                                    /* deal with main dialog getting focus while editing */
                                    self.dialog.addChild(deps.EditionHelper.getDialog());
                                    self.mediaEditorDialog = deps.EditionHelper.getDialog();
                                }).fail(function (reason) {
                                    require("component!notify").error(reason);
                                });
                            }
                        });
                    } catch (e) {
                        Core.exception("MediaLibraryException", 64535, "Media form raised an error.", {
                            error: e
                        });
                    }
                },
                /**
                 * If the node is not loaded yet
                 * Then load it
                 */
                onNodeTreeOpen: function (e) {
                    this.openedMediaFolder = e.node;
                    if (this.openedMediaFolder.hasFormNode) {
                        this.openedMediaFolder.hasFormNode = false;
                        this.loadingMap[this.openedMediaFolder.uid] = this.openedMediaFolder.uid;
                        return;
                    }
                    if (this.openedMediaFolder.isLoaded) {
                        return;
                    }
                    var self = this;
                    (function (node) {
                        /* will not trigger dataStateUpdate */
                        self.mediaFolderDataStore.applyFilter("byMediaFolder", node.uid).execute(false).done(function (data) {
                            if (self.mediaFolderTreeView.isRoot(node)) {
                                node = null;
                            }
                            self.populateMediaFolder(data, node);
                        });
                    }(e.node));
                },

                onReady: function () {
                    var catTreeCtn = jQuery(this.widget).find('.bb5-windowpane-tree .bb5-treeview').eq(0),
                        dataViewCtn = jQuery(this.widget).find(".data-list-ctn").eq(0),
                        paginationCtn = jQuery(this.widget).find('.content-selection-pagination').eq(0),
                        rangeSelectorCtn = jQuery(this.widget).find('.max-per-page-selector').eq(0),
                        searchEnginerCtn = jQuery(this.widget).find(".search-engine-ctn").eq(0);
                    this.rangeSelector.render(rangeSelectorCtn, 'replaceWith');
                    this.treeContainer = jQuery(this.widget).find('.bb5-windowpane-tree').eq(0);
                    this.mediaPagination.render(paginationCtn, 'replaceWith');
                    this.mediaListView.render(dataViewCtn);
                    this.mediaFolderTreeView.render(catTreeCtn);
                    this.searchEngine.render(searchEnginerCtn);
                    this.bindEvents();
                    this.loadMediaFolders();
                    jQuery("#" + this.dialog.id).parent().find(".ui-dialog-buttonpane .ui-dialog-buttonset").addClass("pull-right");
                },

                loadMediaFolders: function () {
                    var self = this;
                    this.mediaFolderDataStore.execute().done(function (result) {
                        self.openedMediaFolder = self.mediaFolderTreeView.getNodeById(result[0].id);
                        self.mediaFolderDataStore.applyFilter("byMediaFolder", self.openedMediaFolder.uid).execute().done(function () {
                            self.mediaFolderTreeView.invoke('openNode', self.openedMediaFolder);
                        });
                    });
                },
                populateMediaFolder: function (data, parentNode) {
                    var formattedData = this.formatData(data);
                    if (!parentNode) {
                        parentNode = this.openedMediaFolder || this.selectedMediaFolder;
                    }
                    this.mediaFolderTreeView.setData(formattedData, parentNode);
                    if (parentNode) {
                        parentNode.isLoaded = true;
                    }
                },

                handleMediaSelection: function (e) {
                    this.loadedNode = e.node;
                    this.mediaDataStore.unApplyFilter("byTitle").unApplyFilter("byBeforeDate").unApplyFilter("byAfterDate").applyFilter("byMediaFolder", e.node.uid).execute();
                },

                formatData: function (data) {
                    var result = [],
                        mediaFolderItem;
                    jQuery.each(data, function (i, mediaFolder) {
                        mediaFolderItem = data[i];
                        if (mediaFolderItem.rel === "folder") {
                            mediaFolderItem.children = [{
                                label: 'Loading ...',
                                is_fake: true
                            }];
                        }
                        mediaFolderItem.label = mediaFolder.title;
                        result.push(mediaFolderItem);
                    });
                    return result;
                },

                initPopin: function () {
                    PopInMng.init("#bb5-ui");
                    return PopInMng.createPopIn(this.config.dialogConfig);
                },

                onOpen: function (library) {
                    library.onReady();
                    library.onReady = jQuery.noop;
                    if (!library.isLoaded) {
                        jQuery(this).html(library.widget);
                    }
                    library.initLayouts();
                    library.fixDataviewLayout();
                    library.isLoaded = true;
                    library.trigger("open");
                },

                handleContextMenu: function (e) {
                    this.contextMenuHelper.setSelectedNode(e.node);
                    this.loadedNode = e.node;
                    this.mediaFolderTreeView.invoke("selectNode", e.node);
                    this.contextMenuHelper.getContextMenu().show(e.click_event);
                },

                handleNodeEdition: function (onEditCallBack, node, title, parentNode) {
                    this.onEditCallBack = onEditCallBack;
                    var parentNodeUid = parentNode ? parentNode.uid : null,
                        jsonNode = {
                            uid: node.uid,
                            title: title,
                            parent_uid: parentNodeUid
                        };
                    this.mediaFolderDataStore.save(jsonNode).done(this.onEditCallBack);
                },

                onMediaStoreUpdate: function () {
                    this.fixDataviewLayout();
                    var resultTotal, rootNode;
                    if (!this.loadedNode) {
                        rootNode = this.mediaFolderTreeView.getRootNode();
                        this.loadedNode = rootNode.children[0];
                    }
                    resultTotal = this.mediaDataStore.getTotal();
                    jQuery(this.widget).find(".result-infos").html(this.loadedNode.name + ' - ' + resultTotal + ' item(s)');
                    this.mediaPagination.setItems(resultTotal);
                },

                handleChanges: function () {
                    this.mediaDataStore.execute();
                },

                bindEvents: function () {
                    var self = this;
                    this.mediaFolderDataStore.on("dataStateUpdate", jQuery.proxy(this.populateMediaFolder, this));
                    this.mediaFolderDataStore.on("processing", jQuery.proxy(this.handleTreeMask, this, "show"));
                    this.mediaFolderDataStore.on("doneProcessing", jQuery.proxy(this.handleTreeMask, this, "remove"));
                    this.mediaDataStore.on("dataStateUpdate", jQuery.proxy(this.onMediaStoreUpdate, this));
                    this.mediaDataStore.on('processing', jQuery.proxy(this.toggleMask, this));
                    this.mediaDataStore.on('doneProcessing', jQuery.proxy(this.toggleMask, this));
                    this.mediaDataStore.on("change", jQuery.proxy(this.handleChanges, this));
                    this.mediaFolderTreeView.on("dblclick", jQuery.proxy(this.handleMediaSelection, this));
                    this.mediaFolderTreeView.on("open", jQuery.proxy(this.onNodeTreeOpen, this));
                    this.mediaFolderTreeView.on("contextmenu", jQuery.proxy(this.handleContextMenu, this));
                    this.mediaFolderTreeView.nodeEditor.on("editNode", jQuery.proxy(this.handleNodeEdition, this));
                    jQuery(this.widget).find(".viewmode-btn").on("click", jQuery.proxy(this.handleViewModeChange, this));
                    this.rangeSelector.on("pageRangeSelectorChange", function (val) {
                        self.mediaDataStore.setLimit(val);
                        self.mediaPagination.setItemsOnPage(val); // -->will trigger pageChange
                    });
                    /* pagination events */
                    this.mediaPagination.on("pageChange", function (page) {
                        self.mediaDataStore.computeNextStart(page);
                        self.mediaDataStore.execute();
                    });
                    this.mediaPagination.on('afterRender', function (isVisible) {
                        var position = (isVisible === true) ? 203 : 178;
                        self.fixDataviewLayout(position);
                    });
                    /* searchEngine */
                    this.searchEngine.on("doSearch", function (criteria) {
                        jQuery.each(criteria, function (key, val) {
                            if (criteria[key] !== undefined) {
                                var filterName = 'by' + key.charAt(0).toUpperCase() + key.slice(1);
                                self.mediaDataStore.applyFilter(filterName, val);
                            }
                        });
                        self.mediaDataStore.execute();
                        window.onerror = function (error) {
                            self.unmask(self.mainZone);
                            self.unmask(self.treeContainer);
                            require("component!notify").error(error);
                        };
                    });
                },

                display: function () {
                    this.dialog.display();
                    this.trigger("open");
                },

                close: function () {
                    this.dialog.hide();
                }
            });
        return {
            init: function (config) {
                /*init get called by the component pluglin */
                defaultConfig = jQuery.extend(true, defaultConfig, config || {});
            },
            createMediaLibrary: function (userConfig) {
                userConfig = userConfig || {};
                var config = jQuery.extend(true, defaultConfig, userConfig),
                    mediaLibrary = new MediaLibrary(config);
                return mediaLibrary;
            },
            MediaLibrary: MediaLibrary
        };
    }
);
