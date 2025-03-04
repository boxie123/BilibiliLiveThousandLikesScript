// ==UserScript==
// @name         b站直播间点赞*1000
// @namespace    https://space.bilibili.com/35192025
// @supportURL   https://space.bilibili.com/35192025
// @version      1.2.0
// @description  不管点赞多少次都会变成1k次
// @author       铂屑
// @license      MIT
// @include      /https?:\/\/live\.bilibili\.com\/(blanc\/)?\d+\??.*/
// @run-at       document-start
// @icon         https://www.google.com/s2/favicons?domain=bilibili.com
// @require      https://unpkg.com/ajax-hook@2.1.3/dist/ajaxhook.min.js
// @require      https://cdn.bootcss.com/blueimp-md5/2.12.0/js/md5.min.js
// @downloadURL https://update.greasyfork.org/scripts/477746/b%E7%AB%99%E7%9B%B4%E6%92%AD%E9%97%B4%E7%82%B9%E8%B5%9E%2A1000.user.js
// @updateURL https://update.greasyfork.org/scripts/477746/b%E7%AB%99%E7%9B%B4%E6%92%AD%E9%97%B4%E7%82%B9%E8%B5%9E%2A1000.meta.js
// ==/UserScript==

(function() {
    'use strict';

    // WBI 签名相关常量和函数
    const mixinKeyEncTab = [
        46, 47, 18, 2, 53, 8, 23, 32, 15, 50, 10, 31, 58, 3, 45, 35, 27, 43, 5, 49,
        33, 9, 42, 19, 29, 28, 14, 39, 12, 38, 41, 13, 37, 48, 7, 16, 24, 55, 40,
        61, 26, 17, 0, 1, 60, 51, 30, 4, 22, 25, 54, 21, 56, 59, 6, 63, 57, 62, 11,
        36, 20, 34, 44, 52
    ];

    // WBI Keys缓存
    let cachedWbiKeys = null;
    let lastWbiKeysFetch = 0;
    const WBI_KEYS_CACHE_DURATION = 600 * 1000; // 10分钟缓存

    // 对 imgKey 和 subKey 进行字符顺序打乱编码
    const getMixinKey = (orig) => mixinKeyEncTab.map(n => orig[n]).join('').slice(0, 32);

    // 为请求参数进行 wbi 签名
    function encWbi(params, img_key, sub_key) {
        const mixin_key = getMixinKey(img_key + sub_key);
        const curr_time = Math.round(Date.now() / 1000);
        const chr_filter = /[!'()*]/g;

        Object.assign(params, { wts: curr_time });

        // 按照 key 重排参数
        const query = Object
            .keys(params)
            .sort()
            .map(key => {
                const value = params[key].toString().replace(chr_filter, '');
                return `${encodeURIComponent(key)}=${encodeURIComponent(value)}`;
            })
            .join('&');

        const wbi_sign = md5(query + mixin_key);
        return query + '&w_rid=' + wbi_sign;
    }

    // 获取最新的 img_key 和 sub_key
    async function getWbiKeys() {
        // 检查缓存
        const now = Date.now();
        if (cachedWbiKeys && (now - lastWbiKeysFetch) < WBI_KEYS_CACHE_DURATION) {
            return cachedWbiKeys;
        }

        try {
            const res = await fetch('https://api.bilibili.com/x/web-interface/nav');
            const { data: { wbi_img: { img_url, sub_url } } } = await res.json();

            cachedWbiKeys = {
                img_key: img_url.slice(img_url.lastIndexOf('/') + 1, img_url.lastIndexOf('.')),
                sub_key: sub_url.slice(sub_url.lastIndexOf('/') + 1, sub_url.lastIndexOf('.'))
            };

            lastWbiKeysFetch = now;
            return cachedWbiKeys;
        } catch (error) {
            console.error('[B站点赞脚本] 获取WBI Keys失败:', error);
            return null;
        }
    }

    // 处理请求URL的函数
    async function processRequest(url) {
        try {
            // 解析URL
            const urlObj = new URL(url);
            const params = Object.fromEntries(urlObj.searchParams);

            // 删除原有的 wts 和 w_rid
            delete params.wts;
            delete params.w_rid;

            // 修改点赞次数
            if (params.click_time) {
                params.click_time = '1000';
            }

            // 获取WBI Keys并添加签名
            const wbiKeys = await getWbiKeys();
            if (wbiKeys) {
                // 生成带签名的查询字符串
                const signedQuery = encWbi(params, wbiKeys.img_key, wbiKeys.sub_key);
                // 返回新的URL
                return `${urlObj.origin}${urlObj.pathname}?${signedQuery}`;
            }

            return url;
        } catch (error) {
            console.error('[B站点赞脚本] URL处理失败:', error);
            return url;
        }
    }

    // 修改拦截XHR请求的部分
    // ah.proxy({
    //     onRequest: async (config, handler) => {
    //         if (config.url.includes('/xlive/app-ucenter/v1/like_info_v3/like/likeReportV3')) {
    //             try {
    //                 config.url = await processRequest(config.url);
    //                 console.log('[B站点赞脚本] 处理后的XHR请求:', config);
    //             } catch (error) {
    //                 console.error('[B站点赞脚本] XHR请求处理失败:', error);
    //             }
    //         }
    //         handler.next(config);
    //     },
    // }, unsafeWindow);

    // 修改拦截Fetch请求的部分
    const originalFetch = unsafeWindow.fetch;
    unsafeWindow.fetch = async function(...args) {
        const [resource, config] = args;

        if (typeof resource === 'string' && resource.includes('/xlive/app-ucenter/v1/like_info_v3/like/likeReportV3')) {
            try {
                args[0] = await processRequest(resource);
                console.log('[B站点赞脚本] 处理后的Fetch请求:', {
                    原始URL: resource,
                    处理后URL: args[0]
                });
            } catch (error) {
                console.error('[B站点赞脚本] Fetch请求处理失败:', error);
            }
        }

        return originalFetch.apply(this, args);
    };

    console.log('[B站点赞脚本] 初始化完成');
})();
