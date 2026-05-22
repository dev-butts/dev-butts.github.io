function httpGetAsync(url, callback) {
    var xmlHttp = new XMLHttpRequest();
    xmlHttp.onreadystatechange = function() { 
        if (xmlHttp.readyState == 4 && xmlHttp.status == 200) {
            callback(xmlHttp.responseText);
        }
    }
    xmlHttp.open("GET", url, true);
    xmlHttp.send(null);
}

const backends = [
    {
        name: "rule34",
        base: "https://rule34-api.netlify.app/posts",
        sort: "sort:",
        preview_name: "preview_url",
        sample_name: "sample_url",
        hq_name: "file_url",
        free_tags: [],
        max_tags: 99999,
    },
    {
        name: "danbooru",
        base: "https://danbooru.donmai.us/posts.json",
        sort: "order:",
        preview_name: "preview_file_url",
        sample_name: "sample_url",
        hq_name: "file_url",
        free_tags: ["score", "rating"],
        max_tags: 2,
    }
];

const LIMIT_IMAGES = 20;
const IMAGE_TIME_S = 9;
const ASPECT_RATIO_LIMIT = 2.5;
const DIMENSION_LIMIT = 6000;

let query_stack = [];
let images = [];
let display_idx = 0;
let busy = 0;
let just_searched = 0;
let dynamic_height = 1080;
let last_artist = "";
let is_paused = 0;

function image_make(info, backend) {
    console.log(info)
    if (!info.hasOwnProperty("file_url")) return;
    if (info.file_url.endsWith("zip")) return;
    if (info.width / info.height > ASPECT_RATIO_LIMIT) return;
    if (info.height / info.width > ASPECT_RATIO_LIMIT) return;
    if (info.width > DIMENSION_LIMIT || info.height > DIMENSION_LIMIT) return;
    let result = {};
    result.hq_url = info[backend.hq_name];
    result.info = info;
    result.is_video = info.file_url.endsWith("mp4");
    if (result.is_video) {
        result.element = document.createElement("video");
        result.element.controls = false;
        result.element.muted = true;
    } else {
        result.element = document.createElement("img");
    }
    result.element.classList.add("pornimage");
    result.element.classList.add(backend.name);
    result.backend = backend;
    const i = images.length - Math.floor(((images.length - display_idx) * Math.random()));
    images.splice(i, 0, result);
}

function image_addsources(img) {
    if (img.info.hasOwnProperty("tag_string_artist")) {
        document.getElementById("asearch").disabled = false;
        last_artist = img.info.tag_string_artist;
        console.log(last_artist)
    } else if (img.info.hasOwnProperty("tag_info")) {
        let dis = true;
        for (let i = 0; i < img.info.tag_info.length; i++) {
            if (img.info.tag_info[i].type == "artist") {
                last_artist = img.info.tag_info[i].tag;
                dis = false;
            }
        }
        if (!dis) {
            console.log(last_artist)
        }
        document.getElementById("asearch").disabled = dis;
    } else {
        document.getElementById("asearch").disabled = true;
    }
    img.info.last_artist
    if (img.is_video) {
        img.element.poster = img.info[img.backend.preview_name];
        img.element.src = img.hq_url;
        img.element.play();
    } else {
        img.element.onload = () => {
            if (img.info.sample_height >= dynamic_height) {
                img.element.src = img.info[img.backend.sample_name];
            } else {
                img.element.src = img.hq_url;
            }
        }
        img.element.src = img.info[img.backend.preview_name];
    }
}

function makepadding() {
    let element = document.createElement("div");
    element.classList.add("pornpadding");
    return element;
}

function next() {
    if (display_idx + 1 >= images.length) {
        setTimeout(() => {
            search();
        }, 10);
        return;
    }
    if (busy) return;
    busy = 1;
    document.getElementById("progress").value = 0;
    if (document.getElementById("porn").children.length == 0 || just_searched) {
        if (display_idx > images.length) {
            busy = 0;
            return;
        }
        let c = document.createElement("div");
        c.classList.add("porncontainer");
        image_addsources(images[display_idx]);
        c.appendChild(makepadding());
        c.appendChild(images[display_idx].element);
        c.appendChild(makepadding());
        document.getElementById("porn").appendChild(c);
        busy = 0;
    } else {
        display_idx ++;
        //document.getElementById("porn").children[0].classList.add("right");
        document.getElementById("porn2").appendChild(document.getElementById("porn").children[0]);
        let c = document.createElement("div");
        c.classList.add("left");
        c.classList.add("porncontainer");
        image_addsources(images[display_idx]);
        c.appendChild(makepadding());
        c.appendChild(images[display_idx].element);
        c.appendChild(makepadding());
        document.getElementById("porn").appendChild(c);
        setTimeout(() => {
            c.classList.remove("left");
            document.getElementById("porn2").children[0].classList.add("right");
        }, 50);
        setTimeout(() => {
            document.getElementById("porn2").removeChild(document.getElementById("porn2").children[0]);
            busy = 0;
        }, 1000);
    }
}

function prev() {
    if (display_idx == 0) return;
    if (busy) return;
    document.getElementById("progress").value = 0;
    busy = 1;
    if (document.getElementById("porn").children.length == 0) {
        if (display_idx < 0) {
            busy = 0;
            return;
        }
        let c = document.createElement("div");
        c.classList.add("porncontainer");
        image_addsources(images[display_idx]);
        c.appendChild(makepadding());
        c.appendChild(images[display_idx].element);
        c.appendChild(makepadding());
        document.getElementById("porn").appendChild(c);
        busy = 0;
    } else {
        display_idx --;
        //document.getElementById("porn").children[0].classList.add("left");
        document.getElementById("porn2").appendChild(document.getElementById("porn").children[0]);
        let c = document.createElement("div");
        c.classList.add("right");
        c.classList.add("porncontainer");
        image_addsources(images[display_idx]);
        c.appendChild(makepadding());
        c.appendChild(images[display_idx].element);
        c.appendChild(makepadding());
        document.getElementById("porn").appendChild(c);
        setTimeout(() => {
            c.classList.remove("right");
            document.getElementById("porn2").children[0].classList.add("left");
        }, 50);
        setTimeout(() => {
            document.getElementById("porn2").removeChild(document.getElementById("porn2").children[0]);
            busy = 0;
        }, 1000);
    }
}

function is_tag_free(tag, free_tags) {
    for (let i = 0; i < free_tags.length; i++) {
        if (tag.startsWith(free_tags[i] + ":")) {
            return true;
        }
    }
    return false;
}

function search() {
    let query = document.getElementById("query").value;
    query_stack.push(query);
    let tags = query.split(",");
    for (let i = 0; i < tags.length; i++) {
        tags[i] = tags[i].trim();
    }
    just_searched = 1;

    images = [];
    display_idx = 0;
    if (document.getElementById("porn").children.length > 0) {
        for (let i = 0; i < document.getElementById("porn").children.length; i++) {
            let c = document.getElementById("porn").children[i];
            document.getElementById("porn2").appendChild(c);
            setTimeout(() => {
                c.classList.add("right");
            }, 50);
            setTimeout(() => {
                document.getElementById("porn2").removeChild(c);
                busy = 0;
            }, 1000);
        }
    }

    for (let n = 0; n < backends.length; n++) {
        let len = tags.length;
        for (let i = 0; i < tags.length; i++) {
            if (is_tag_free(tags[i], backends[n].free_tags)) {
                len -= 1;
            }
        }

        let custom_tags = [];
        let non_free_tags = 0
        for (let i = 0; i < tags.length; i++) {
            if (!is_tag_free(tags[i], backends[n].free_tags)) {
                if (non_free_tags < backends[n].max_tags) {
                    non_free_tags += 1;
                    custom_tags.push(tags[i]);
                }
            } else {
                custom_tags.push(tags[i]);
            }
        }
        let uri = backends[n].base + "?limit=" + LIMIT_IMAGES + "&page=dapi&q=index&json=1&pid=0&tags=" + custom_tags.join("+").replace("sort:", backends[n].sort);
        console.log(uri, encodeURI(uri))
        httpGetAsync(encodeURI(uri), (json) => {
            if (json.length == 0) {
                just_searched = 0;
                return;
            }
            console.log("response from ", backends[n].name);
            const j = JSON.parse(json);
            for (let i = 0; i < j.length; i++) {
                image_make(j[i], backends[n]);
            }
            if (document.getElementById("porn").children.length == 0 || just_searched) {
                display_idx = 0;
                next();
            }
            just_searched = 0;
        });
    }
}

function morebyartist() {
    document.getElementById("query").value = last_artist + ", sort:random";
    search();
}

function prevsearch() {
    if (query_stack.length >= 2) {
        query_stack.pop();
        document.getElementById("query").value = query_stack[query_stack.length-1];
        search();
        query_stack.pop();
    }
}

function pauseunpause() {
    is_paused = !is_paused;
    if (is_paused) {
        document.getElementById("pause").innerHTML = "Unpause";
    } else {
        document.getElementById("pause").innerHTML = "Pause";
    }
}

function tickslow() {
    dynamic_height = document.body.offsetHeight;
}

function tick() {
    let p = document.getElementById("progress");
    if (images.length > 0 && display_idx < images.length && display_idx >= 0) {
        if (images[display_idx].is_video) {
            if (isNaN(images[display_idx].element.duration)) {
                p.max = 1000;
                p.value = 0;
            } else {                
                p.value = images[display_idx].element.currentTime * 100;
                p.max = images[display_idx].element.duration * 100;
                if (images[display_idx].element.currentTime >= images[display_idx].element.duration) {
                    next();
                }
            }
        } else {
            p.max = 1000;
            if (!is_paused) {
                p.value += 1000/(IMAGE_TIME_S * 1000 / 20);
            }
            if (p.value >= 1000) {
                next();
            }
        }
    } else {
        p.value = 0;
        p.max = 1000;
    }
}

document.onkeydown = (e) => {
    if (document.activeElement == document.getElementById("query")) return;
    if (e.key == "d" || e.key == "ArrowRight") {
        prev();
    }
    if (e.key == "a" || e.key == "ArrowLeft") {
        next();
    }
}

setInterval(() => {
    tickslow();
}, 500);

setInterval(() => {
    tick();
}, 20);

setTimeout(() => {
    search();
    document.getElementById("rightarrow").onclick = (e) => {
        prev();
    }
    document.getElementById("leftarrow").onclick = (e) => {
        next();
    }
}, 10);
