(function (c, d, x) {
    window._dsb = {host: "https://idata.easysol.net", clientId: c, ucall: x};
    var a = document.createElement("script");
    a.type = "text/javascript";
    var b = encodeURIComponent(window.location.href.toString()).replace(/[!'()]/g, "%27").replace(/\*/g, "%2A");
    a.src = "https://idata.easysol.net/" + c + "/" + d + "/analitycs.js?url\x3d" + b + "\x26tstamp\x3d" + (new Date).getSeconds();
    a.async = !0;
    b = document.getElementsByTagName("script")[0];
    b.parentNode.insertBefore(a, b)
})('57367b8e3eaab4272137cea62c7ac855', 388);