// ==UserScript==
// @name         b站直播间点赞*1000
// @namespace    https://space.bilibili.com/35192025
// @supportURL   https://space.bilibili.com/35192025
// @version      1.0.0
// @description  不管点赞多少次都会变成1k次
// @author       铂屑
// @license      MIT
// @include      /https?:\/\/live\.bilibili\.com\/(blanc\/)?\d+\??.*/
// @run-at       document-start
// @icon         https://www.google.com/s2/favicons?domain=bilibili.com
// @require      https://unpkg.com/ajax-hook@2.1.3/dist/ajaxhook.min.js
// ==/UserScript==

(function() {
    'use strict';
    ah.proxy({
        onRequest: (config, handler) => {
            //console.log(config)
            if (config.url.includes('/xlive/app-ucenter/v1/like_info_v3/like/likeReportV3')) {
                config.body = config.body.replace(/click_time=[0-9]+/,'click_time=1000')
                handler.next(config);
            }
            else{
                handler.next(config);
            }
        },
    },unsafeWindow);
})();
