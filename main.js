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
        max_tags: 99999,
    },
    {
        name: "danbooru",
        base: "https://danbooru.donmai.us/posts.json",
        sort: "order:",
        preview_name: "preview_file_url",
        max_tags: 2,
    },
];

let images = [];
let display_idx = 0;
let busy = 0;
let just_searched = 0;

function image_make(info, backend) {
    if (info.file_url.endsWith("zip")) return;
    let result = {};
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
    if (img.is_video) {
        img.element.poster = img.info[img.backend.preview_name];
        img.element.src = img.info.file_url;
        img.element.play();
    } else {
        img.element.onload = () => {
            img.element.src = img.info.file_url;
        }
        img.element.src = img.info[img.backend.preview_name];
    }
}

function next() {
    if (display_idx + 1 >= images.length) return;
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
        c.appendChild(images[display_idx].element);
        document.getElementById("porn").appendChild(c);
        busy = 0;
    } else {
        display_idx ++;
        document.getElementById("porn").children[0].classList.add("right");
        let c = document.createElement("div");
        c.classList.add("left");
        c.classList.add("porncontainer");
        image_addsources(images[display_idx]);
        c.appendChild(images[display_idx].element);
        document.getElementById("porn").appendChild(c);
        setTimeout(() => {
            c.classList.remove("left");
        }, 20);
        setTimeout(() => {
            document.getElementById("porn").removeChild(document.getElementById("porn").children[0]);
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
        c.appendChild(images[display_idx].element);
        document.getElementById("porn").appendChild(c);
        busy = 0;
    } else {
        display_idx --;
        document.getElementById("porn").children[0].classList.add("left");
        let c = document.createElement("div");
        c.classList.add("right");
        c.classList.add("porncontainer");
        image_addsources(images[display_idx]);
        c.appendChild(images[display_idx].element);
        document.getElementById("porn").appendChild(c);
        setTimeout(() => {
            c.classList.remove("right");
        }, 20);
        setTimeout(() => {
            document.getElementById("porn").removeChild(document.getElementById("porn").children[0]);
            busy = 0;
        }, 1000);
    }
}

function search() {
    let query = document.getElementById("query").value;
    let tags = query.split(",");
    for (let i = 0; i < tags.length; i++) {
        tags[i] = tags[i].trim();
    }
    console.log(tags)
    just_searched = 1;

    images = [];
    display_idx = 0;
    if (document.getElementById("porn").children.length > 0) {
        for (let i = 0; i < document.getElementById("porn").children.length; i++) {
            let c = document.getElementById("porn").children[i];
            c.classList.add("right");
            setTimeout(() => {
                document.getElementById("porn").removeChild(c);
            }, 1000);
        }
    }

    for (let n = 0; n < backends.length; n++) {
        httpGetAsync(backends[n].base + "?limit=20&pid=0&tags=" + tags.join("+").replace("sort:", backends[n].sort), (json) => {
            const j = JSON.parse(json);
            console.log("response from ", backends[n].name);
            console.log(j);
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

function tickslow() {
    let pc = document.getElementsByClassName("porncontainer");
    let h = document.getElementById("porn").offsetHeight;
    for (let i = 0; i < pc.length; i++) {
        pc[i].style.height = (h-8) + "px";
    }
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
            p.value += 4;
            if (p.value >= 1000) {
                next();
            }
        }
    } else {
        p.value = 0;
        p.max = 1000;
    }
}

document.onkeypress = (e) => {
    if (document.activeElement == document.getElementById("query")) return;
    if (e.key == "d") {
        next();
    }
    if (e.key == "a") {
        prev();
    }
}

setInterval(() => {
    tick();
}, 20);

setInterval(() => {
    tickslow();
}, 50);

setTimeout(() => {
    search();
}, 10);
