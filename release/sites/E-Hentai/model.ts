function cssToObject(css: string): any {
    const ret: any = {};
    css.split(";").map((style: string) => {
        style = style.trim();
        const index: number = style.indexOf(":");
        if (index < 0) {
            return;
        }
        ret[style.substr(0, index).trim()] = style.substr(index + 1).trim();
    });
    return ret;
}

function sizeToInt(size: string): number {
    const match = size.match(/^(-?)(\d+)\w*$/);
    const val = parseInt(match[2], 10);
    if (match[1].length > 0) {
        return -val;
    }
    return val;
}

export const source: ISource = {
    name: "E-Hentai",
    modifiers: [],
    forcedTokens: ["*"],
    searchFormat: {
        and: " ",
    },
    auth: {
        post: {
            type: "post",
            url: "https://forums.e-hentai.org/index.php?act=Login&CODE=01",
            fields: [
                {
                    id: "pseudo",
                    key: "UserName",
                },
                {
                    id: "password",
                    key: "PassWord",
                    type: "password",
                },
                {
                    type: "const",
                    key: "CookieDate",
                    value: "1",
                },
                {
                    type: "const",
                    key: "b",
                    value: "d",
                },
                {
                    type: "const",
                    key: "bt",
                    value: "1-1",
                },
            ],
            check: {
                type: "cookie",
                key: "ipb_member_id",
            },
        },
    },
    apis: {
        html: {
            name: "Regex",
            auth: [],
            forcedLimit: 25,
            search: {
                url: (query: any, opts: any, previous: any): string => {
                    return "/?page=" + (query.page - 1) + "&f_search=" + encodeURIComponent(query.search);
                },
                parse: (src: string): IParsedSearch => {
                    const matches = Grabber.regexMatches('<tr[^>]*><td[^>]*><div[^>]*>(?<category>[^<]*)</div></td><td[^>]*><div[^>]* id="i(?<id>\\d+)"[^>]*>(?:<img src="(?<preview_url>[^"]+)"[^>]*>|(?<encoded_thumbnail>[^<]*))</div><div[^>]*>(?<date>[^<]+)</div>.+?<div><a href="(?<page_url>[^"]+)">(?<name>[^<]+)</a>.+?<a[^>]+>(?<author>[^<]+)</a>', src);
                    const images = matches.map((match: any) => {
                        match["type"] = "gallery";
                        if ("encoded_thumbnail" in match && match["encoded_thumbnail"].length > 0) {
                            const parts = match["encoded_thumbnail"].split("~");
                            const protocol = parts[0] === "init" ? "http://" : "https://";
                            match["preview_url"] = protocol + parts[1] + "/" + parts[2];
                            delete match["encoded_thumbnail"];
                        }
                        const gallery = Grabber.regexMatches("/g/(?<id>\\d+)/(?<token>[^/]+)/", match["page_url"]);
                        match["id"] = gallery[0]["id"];
                        match["token"] = gallery[0]["token"];
                        match["md5"] = match["id"] + "/" + match["token"];
                        return match;
                    });
                    return {
                        images,
                        pageCount: Grabber.countToInt(Grabber.regexToConst("page", ">(?<page>[0-9,]+)</a></td><td[^>]*>(?:&gt;|<a[^>]*>&gt;</a>)</td>", src)),
                        imageCount: Grabber.countToInt(Grabber.regexToConst("count", ">Showing page \\d+ of (?<count>[0-9,]+) results<", src)),
                    };
                },
            },
            gallery: {
                url: (query: any, opts: any): string => {
                    return "/g/" + query.md5 + "/?p=" + (query.page - 1);
                },
                parse: (src: string): IParsedGallery => {
                    const images: IImage[] = [];
                    const matches = Grabber.regexMatches('<div class="gdtm"[^>]*><div style="(?<div_style>[^"]+)"><a href="(?<page_url>[^"]+)"><img[^>]*></a></div>', src);
                    for (const match of matches) {
                        const styles = cssToObject(match["div_style"]);
                        delete match["div_style"];

                        const background = styles["background"].match(/url\(([^)]+)\) ([^ ]+) ([^ ]+)/);
                        match["preview_url"] = background[1];
                        match["preview_rect"] = [
                            -sizeToInt(background[2]),
                            -sizeToInt(background[3]),
                            sizeToInt(styles["width"]),
                            sizeToInt(styles["height"]),
                        ].join(";"); // x;y;w;h

                        images.push(match);
                    }

                    return {
                        images,
                        pageCount: Grabber.countToInt(Grabber.regexToConst("page", ">(?<page>[0-9,]+)</a></td><td[^>]*>(?:&gt;|<a[^>]*>&gt;</a>)</td>", src)),
                        imageCount: Grabber.countToInt(Grabber.regexToConst("count", '<p class="gpc">Showing [0-9,]+ - [0-9,]+ of (?<count>[0-9,]+) images</p>', src)),
                        urlNextPage: Grabber.regexToConst("url", '<td[^>]*><a[^>]+href="(?<url>[^"]+)"[^>]*>&gt;</a></td>', src),
                        urlPrevPage: Grabber.regexToConst("url", '<td[^>]*><a[^>]+href="(?<url>[^"]+)"[^>]*>&lt;</a></td>', src),
                    };
                },
            },
            details: {
                url: (id: number, md5: string): IError => {
                    return { error: "Not supported (view token)" };
                },
                parse: (src: string): IParsedDetails => {
                    // Grabber.regexMatches("<div>(?<filename>[^:]*) :: (?<width>\\d+) x (?<height>\\d+) :: (?<filesize>[^ ]+ [KM]B)</div>", src);
                    return {
                        imageUrl: Grabber.regexToConst("url", '<img id="img" src="(?<url>[^"]+)"', src),
                    };
                },
            },
        },
    },
};
