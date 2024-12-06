document.addEventListener("DOMContentLoaded", function() {
    // Check if we are in Jotform environment
    const isJotformEnv = (typeof JFCustomWidget !== "undefined" && JFCustomWidget.getWidgetSetting);

    // Fallback values if JFCustomWidget is not available or setting is missing
    // let type = "spinner";
    //let time = 5000;
    //let ellipsesEnabled = true;
    //let primaryColor = "#3498db";
    //let redirect = false;
    //let redirectPage = "";
    //let redirectTargetAttr = "self";
    //let texts = ["Loading your data.", "Almost there...", "Just a moment."];

    if (isJotformEnv) {
        // Override with JFCustomWidget settings if available
        type = JFCustomWidget.getWidgetSetting("type") || type;
        time = parseInt(JFCustomWidget.getWidgetSetting("time"), 10) || time;
        ellipsesEnabled = (JFCustomWidget.getWidgetSetting("ellipses") || (ellipsesEnabled ? "true" : "false")).toLowerCase() === "true";
        primaryColor = JFCustomWidget.getWidgetSetting("color") || primaryColor;
        redirect = (JFCustomWidget.getWidgetSetting("redirect") || (redirect ? "true" : "false")).toLowerCase() === "true";
        redirectPage = JFCustomWidget.getWidgetSetting("redirectPage") || redirectPage;
        redirectTargetAttr = JFCustomWidget.getWidgetSetting("redirectTarget") || redirectTargetAttr;

        let textsAttr = JFCustomWidget.getWidgetSetting("texts");
        if (textsAttr) {
            try {
                texts = JSON.parse(textsAttr);
            } catch (e) {
                texts = [textsAttr];
            }
        }
        if (!Array.isArray(texts) || texts.length === 0) {
            texts = ["Loading"];
        }
    }

    // Remove trailing periods
    texts = texts.map(txt => txt.replace(/\.+$/, ''));

    const textCount = texts.length;
    const textInterval = time / textCount;

    const container = document.getElementById("widget-container");

    // Create text display
    const textDisplay = document.createElement("div");
    textDisplay.className = "text-display";
    container.appendChild(textDisplay);

    let spinnerCircle = null;
    let spinnerWrapper = null;
    let loadbarContainer = null;
    let loadbarFill = null;

    if (type === "spinner") {
        spinnerWrapper = createSpinner();
    } else if (type === "loadbar") {
        [loadbarContainer, loadbarFill] = createLoadbar();
    }

    const timeouts = [];

    function showTextWithEllipses(txt, startDelay) {
        // Immediately ".  "
        queueTimeout(() => {
            textDisplay.textContent = txt + ".  ";
        }, startDelay);

        // After textInterval/3: ".. "
        queueTimeout(() => {
            textDisplay.textContent = txt + ".. ";
        }, startDelay + textInterval / 3);

        // After 2*(textInterval/3): "..."
        queueTimeout(() => {
            textDisplay.textContent = txt + "...";
        }, startDelay + (2 * textInterval) / 3);
    }

    texts.forEach((txt, i) => {
        const startTime = i * textInterval;
        showTextWithEllipses(txt, startTime);
    });

    // After all texts done, finish
    queueTimeout(() => {
        finishSequence();
    }, time);

    function finishSequence() {
        // Clear all future timeouts
        timeouts.forEach(tid => clearTimeout(tid));

        if (redirect) {
            if (redirectPage.trim() !== "") {
                let redirectTarget = "_self";
                if (redirectTargetAttr === "blank") redirectTarget = "_blank";
                else if (redirectTargetAttr === "top") redirectTarget = "_top";
                window.open(redirectPage, redirectTarget);
            } else {
                // If in Jotform env, go to next page
                // If not in Jotform env, do nothing special
                if (isJotformEnv) {
                    parent.postMessage({action: "nextPage"}, "*");
                }
            }
        } else {
            showCompletionAnimation();
        }
    }

    function showCompletionAnimation() {
        if (type === "spinner") {
            finalizeSpinner();
        } else if (type === "loadbar") {
            finalizeLoadbar();
        } else {
            finalizeTextOnly();
        }
    }

    function finalizeSpinner() {
        spinnerCircle.classList.remove("spinner-circle");
        spinnerCircle.setAttribute("stroke", "#28a745"); // green
        spinnerCircle.style.transition = "stroke-dashoffset 1s ease";
        spinnerCircle.style.strokeDashoffset = "0";

        const checkmark = createCheckmark();
        spinnerWrapper.appendChild(checkmark);
        queueTimeout(() => checkmark.classList.add("show"), 50);

        textDisplay.textContent = "Complete!";
    }

    function finalizeLoadbar() {
        loadbarFill.style.width = "100%";
        loadbarFill.style.background = "#28a745"; // green
        textDisplay.textContent = "Complete!";
    }

    function finalizeTextOnly() {
        textDisplay.textContent = "Complete!";
    }

    function createCheckmark() {
        const checkmark = document.createElement("div");
        checkmark.className = "checkmark";
        return checkmark;
    }

    function createSpinner() {
        const spinnerWrapper = document.createElement("div");
        spinnerWrapper.className = "spinner-wrapper";
        container.insertBefore(spinnerWrapper, textDisplay);

        const svgNS = "http://www.w3.org/2000/svg";
        const svg = document.createElementNS(svgNS, "svg");
        svg.setAttribute("viewBox", "0 0 50 50");

        const circle = document.createElementNS(svgNS, "circle");
        circle.setAttribute("cx", "25");
        circle.setAttribute("cy", "25");
        circle.setAttribute("r", "20");
        circle.setAttribute("fill", "none");
        circle.setAttribute("stroke", primaryColor);
        circle.setAttribute("stroke-width", "4");
        circle.setAttribute("stroke-linecap", "round");

        const circumference = 125.66;
        circle.style.strokeDasharray = circumference;
        circle.style.strokeDashoffset = circumference * 0.75;
        circle.classList.add("spinner-circle");

        svg.appendChild(circle);
        spinnerWrapper.appendChild(svg);

        spinnerCircle = circle;
        return spinnerWrapper;
    }

    function createLoadbar() {
        const barContainer = document.createElement("div");
        barContainer.className = "loadbar-container";

        const barFill = document.createElement("div");
        barFill.className = "loadbar-fill";
        barFill.style.background = primaryColor;
        barContainer.appendChild(barFill);

        container.insertBefore(barContainer, textDisplay);

        let startTime = null;
        function animateLoadbar(timestamp) {
            if (!startTime) startTime = timestamp;
            const elapsed = timestamp - startTime;
            const progress = Math.min(elapsed / time, 1);
            barFill.style.width = (progress * 100) + "%";
            if (progress < 1) {
                requestAnimationFrame(animateLoadbar);
            }
        }
        requestAnimationFrame(animateLoadbar);

        return [barContainer, barFill];
    }

    function queueTimeout(fn, delay) {
        const id = setTimeout(fn, delay);
        timeouts.push(id);
    }
});
