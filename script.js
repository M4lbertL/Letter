

(() => {
    "use strict";

    // DOM REFERENCES
    const experience = document.querySelector("#experience");
    const scene = document.querySelector("#scene");
    const envelopeAnchor = document.querySelector(".envelope-anchor");
    const flap = document.querySelector(".flap");
    const letterStage = document.querySelector("#letterStage");
    const envelopeTrigger = document.querySelector("#envelopeTrigger");
    const backgroundMusic = document.querySelector("#backgroundMusic");
    const musicToggle = document.querySelector("#musicToggle");
    const instruction = document.querySelector("#instruction");
    const yesButton = document.querySelector("#yesButton");
    const noButton = document.querySelector("#noButton");
    const answerMessage = document.querySelector("#answerMessage");
    const celebrationLayer = document.querySelector("#celebrationLayer");
    const letterCard = document.querySelector("#letterCard");
    const pageFlipButton = document.querySelector("#pageFlipButton");

    const requiredElements = [
        experience,
        scene,
        envelopeAnchor,
        flap,
        letterStage,
        envelopeTrigger,
        backgroundMusic,
        musicToggle,
        instruction,
        yesButton,
        noButton,
        answerMessage,
        celebrationLayer,
        letterCard,
        pageFlipButton
    ];

    if (requiredElements.some((element) => !element)) {
        throw new Error("Courting letter UI is missing one or more required elements.");
    }

    
    const BEFORE_ENVELOPE_DROP_PAUSE_MS = 90;

    // STATE
    let stage = "back";
    let pageSide = "front";

    // PLAYFUL NO BUTTON
    const NO_BUTTON_EDGE_MARGIN = 24;
    const NO_TRIGGER_PADDING = 95;
    const NO_DODGE_COOLDOWN_MS = 300;
    const RESPONSE_REVEAL_DELAY_MS = 2000;

    let responseRevealTimer = null;
    let noButtonIsFloating = false;
    let noDodgeLockedUntil = 0;

    function setStage(nextStage) {
        stage = nextStage;
        scene.dataset.stage = nextStage;
        experience.dataset.stage = nextStage;
    }

    function setPage(nextPage) {
        pageSide = nextPage;
        scene.dataset.page = nextPage;

        if (nextPage === "back") {
            letterCard.classList.add("is-flipped");
            instruction.textContent = "One more thing I wanted to say ♡";
            return;
        }

        letterCard.classList.remove("is-flipped");

        if (stage === "letter") {
            instruction.textContent = "Turn the lower-left corner when you’re ready.";
        }
    }


    // BACKGROUND MUSIC
    const MUSIC_TARGET_VOLUME = 0.22;
    const MUSIC_FADE_DURATION_MS = 2200;

    let musicStarted = false;
    let musicMuted = false;
    let musicFadeFrame = null;

    function fadeMusicTo(targetVolume, duration = MUSIC_FADE_DURATION_MS) {
        if (musicFadeFrame) {
            cancelAnimationFrame(musicFadeFrame);
        }

        const startVolume = backgroundMusic.volume;
        const startTime = performance.now();

        function updateVolume(now) {
            const progress = Math.min((now - startTime) / duration, 1);
            const easedProgress = 1 - Math.pow(1 - progress, 3);

            backgroundMusic.volume =
                startVolume +
                (targetVolume - startVolume) * easedProgress;

            if (progress < 1) {
                musicFadeFrame = requestAnimationFrame(updateVolume);
            } else {
                musicFadeFrame = null;
            }
        }

        musicFadeFrame = requestAnimationFrame(updateVolume);
    }

    async function startBackgroundMusic() {
        if (musicStarted || musicMuted) {
            return true;
        }

        backgroundMusic.volume = 0;

        try {
            await backgroundMusic.play();

            musicStarted = true;
            fadeMusicTo(MUSIC_TARGET_VOLUME);

            return true;
        } catch (error) {
            musicStarted = false;

            // Most browsers may block audible autoplay until the visitor
            // interacts with the page. The site keeps working normally.
            console.info(
                "Background music autoplay was blocked. "
                + "It will retry on the first user interaction.",
                error
            );

            return false;
        }
    }

    function updateMusicButton() {
        musicToggle.textContent = musicMuted ? "♩" : "♪";
        musicToggle.classList.toggle("is-muted", musicMuted);
        musicToggle.setAttribute(
            "aria-label",
            musicMuted
                ? "Play background music"
                : "Mute background music"
        );
        musicToggle.setAttribute(
            "aria-pressed",
            String(musicMuted)
        );
    }

    async function toggleBackgroundMusic() {
        musicMuted = !musicMuted;
        updateMusicButton();

        if (musicMuted) {
            fadeMusicTo(0, 350);

            window.setTimeout(() => {
                if (musicMuted) {
                    backgroundMusic.pause();
                }
            }, 380);

            return;
        }

        backgroundMusic.volume = 0;

        try {
            await backgroundMusic.play();
            musicStarted = true;
            fadeMusicTo(MUSIC_TARGET_VOLUME, 650);
        } catch (error) {
            musicStarted = false;
            console.info("Background music could not resume:", error);
        }
    }

    // ENVELOPE ANIMATION
    function handleEnvelopeClick() {
        if (stage === "back") {
            showEnvelopeFront();
            return;
        }

        if (stage === "front") {
            openEnvelope();
        }
    }

    function showEnvelopeFront() {
        setStage("front");
        instruction.textContent = "Now click again to open it.";
        envelopeTrigger.setAttribute("aria-label", "Open the envelope");
    }

    function openEnvelope() {
        setStage("opening");

        instruction.textContent = "Opening your letter...";
        envelopeTrigger.disabled = true;
        envelopeTrigger.setAttribute("aria-hidden", "true");

        flap.addEventListener("transitionend", handleFlapOpened);
    }

    function handleFlapOpened(event) {
        if (stage !== "opening" || event.propertyName !== "transform") {
            return;
        }

        flap.removeEventListener("transitionend", handleFlapOpened);

        flap.classList.add("is-behind");

        setStage("peeking");
        instruction.textContent = "Just for you ♡";

        letterStage.addEventListener("transitionend", handleLetterPeeked);
    }

    function handleLetterPeeked(event) {
        if (stage !== "peeking" || event.propertyName !== "transform") {
            return;
        }

        letterStage.removeEventListener("transitionend", handleLetterPeeked);

        window.setTimeout(() => {
            setStage("dropping");
            envelopeAnchor.addEventListener("transitionend", handleEnvelopeDropped);
        }, BEFORE_ENVELOPE_DROP_PAUSE_MS);
    }

    function handleEnvelopeDropped(event) {
        if (stage !== "dropping" || event.propertyName !== "transform") {
            return;
        }

        envelopeAnchor.removeEventListener("transitionend", handleEnvelopeDropped);

        scene.classList.remove("letter-settled");

        setStage("letter");
        setPage("front");

        instruction.textContent = "Just a little more ♡";

        letterStage.addEventListener(
            "transitionend",
            handleLetterSettled
        );
    }

    function handleLetterSettled(event) {
        if (stage !== "letter" || event.propertyName !== "transform") {
            return;
        }

        letterStage.removeEventListener(
            "transitionend",
            handleLetterSettled
        );

        scene.classList.add("letter-settled");
        scene.classList.remove("response-ready");

        instruction.textContent =
            "See the next page when you’re ready ♡";
    }

    // RESPONSE REVEAL
    function scheduleResponseReveal() {
        scene.classList.remove("response-ready");

        if (responseRevealTimer) {
            window.clearTimeout(responseRevealTimer);
        }

        responseRevealTimer = window.setTimeout(() => {
            if (
                pageSide === "back" &&
                (stage === "letter" || stage === "answered")
            ) {
                scene.classList.add("response-ready");
            }
        }, RESPONSE_REVEAL_DELAY_MS);
    }

    // PAGE FLIP
    function flipLetterPage() {
        if (stage !== "letter" && stage !== "answered") {
            return;
        }

        if (pageSide !== "front") {
            return;
        }

        scene.classList.add("page-flipping");
        scene.classList.remove("response-ready");

        /*
         * Collapse the paper almost flat first. At the midpoint, swap the
         * visible page, then expand it again. This avoids the browser's 3D
         * edge-rendering artifacts that caused the white vertical bars.
         */
        letterCard.classList.add("is-page-collapsed");

        const handleCollapseFinished = (event) => {
            if (event.propertyName !== "transform") {
                return;
            }

            letterCard.removeEventListener(
                "transitionend",
                handleCollapseFinished
            );

            setPage("back");

            requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    letterCard.classList.remove("is-page-collapsed");

                    letterCard.addEventListener(
                        "transitionend",
                        handleExpandFinished
                    );
                });
            });
        };

        const handleExpandFinished = (event) => {
            if (event.propertyName !== "transform") {
                return;
            }

            letterCard.removeEventListener(
                "transitionend",
                handleExpandFinished
            );

            scene.classList.remove("page-flipping");
            scheduleResponseReveal();
        };

        letterCard.addEventListener(
            "transitionend",
            handleCollapseFinished
        );
    }

    // YES / NO RESPONSE
    function answerLetter(answer) {
        const canAnswer =
            (stage === "letter" || stage === "answered") &&
            pageSide === "back" &&
            scene.classList.contains("response-ready");

        if (!canAnswer) {
            return;
        }

        if (stage !== "answered") {
            setStage("answered");
        }

        if (answer === "yes") {
            answerMessage.textContent =
                "Thank you! Princess♡";

            // Yes intentionally stays clickable so the heart celebration
            // can be triggered again.
            createCelebrationHearts();
            return;
        }

        answerMessage.textContent =
            "";
    }

    function clampNoButtonToViewport() {
        if (!noButtonIsFloating) {
            return;
        }

        const rect = noButton.getBoundingClientRect();

        const maxLeft = Math.max(
            NO_BUTTON_EDGE_MARGIN,
            window.innerWidth -
            rect.width -
            NO_BUTTON_EDGE_MARGIN
        );

        const maxTop = Math.max(
            NO_BUTTON_EDGE_MARGIN,
            window.innerHeight -
            rect.height -
            NO_BUTTON_EDGE_MARGIN
        );

        const currentLeft =
            Number.parseFloat(noButton.style.left) || rect.left;

        const currentTop =
            Number.parseFloat(noButton.style.top) || rect.top;

        noButton.style.left =
            `${Math.min(Math.max(currentLeft, NO_BUTTON_EDGE_MARGIN), maxLeft)}px`;

        noButton.style.top =
            `${Math.min(Math.max(currentTop, NO_BUTTON_EDGE_MARGIN), maxTop)}px`;
    }

    function makeNoButtonFloating() {
        if (noButtonIsFloating) {
            return;
        }

        const rect = noButton.getBoundingClientRect();

        document.body.appendChild(noButton);

        noButton.classList.add("is-floating");

        noButton.style.width = `${rect.width}px`;
        noButton.style.left = `${rect.left}px`;
        noButton.style.top = `${rect.top}px`;

        noButtonIsFloating = true;

        clampNoButtonToViewport();
    }

    function moveNoButtonToRandomSafePosition() {
        makeNoButtonFloating();

        const rect = noButton.getBoundingClientRect();

        const minLeft = NO_BUTTON_EDGE_MARGIN;
        const maxLeft = Math.max(
            minLeft,
            window.innerWidth -
            rect.width -
            NO_BUTTON_EDGE_MARGIN
        );

        const minTop = NO_BUTTON_EDGE_MARGIN;
        const maxTop = Math.max(
            minTop,
            window.innerHeight -
            rect.height -
            NO_BUTTON_EDGE_MARGIN
        );

        const randomLeft =
            minLeft +
            Math.random() * Math.max(0, maxLeft - minLeft);

        const randomTop =
            minTop +
            Math.random() * Math.max(0, maxTop - minTop);

        noButton.style.left = `${Math.round(randomLeft)}px`;
        noButton.style.top = `${Math.round(randomTop)}px`;

        /*
         * Use the same short cooldown after every dodge.
         * There is no longer a special pause every third hover.
         */
        noDodgeLockedUntil =
            performance.now() +
            NO_DODGE_COOLDOWN_MS;
    }

    function watchNoButtonProximity(event) {
        const canDodge =
            event.pointerType === "mouse" &&
            pageSide === "back" &&
            (stage === "letter" || stage === "answered") &&
            scene.classList.contains("response-ready");

        if (!canDodge) {
            return;
        }

        if (performance.now() < noDodgeLockedUntil) {
            return;
        }

        const rect = noButton.getBoundingClientRect();

        /*
         * Use an invisible proximity zone around No. The mouse triggers the
         * dodge before it physically reaches the button.
         */
        const insideExpandedHitbox =
            event.clientX >= rect.left - NO_TRIGGER_PADDING &&
            event.clientX <= rect.right + NO_TRIGGER_PADDING &&
            event.clientY >= rect.top - NO_TRIGGER_PADDING &&
            event.clientY <= rect.bottom + NO_TRIGGER_PADDING;

        if (!insideExpandedHitbox) {
            return;
        }

        /*
         * Always dodge when the mouse enters the expanded proximity zone.
         * The button itself remains enabled; it is not disabled or removed.
         */
        moveNoButtonToRandomSafePosition();
    }

    function createCelebrationHearts() {
        const heartCount = 30;

        for (let index = 0; index < heartCount; index += 1) {
            const heart = document.createElement("span");

            heart.className = "celebration-heart";
            heart.textContent = index % 3 === 0 ? "♥" : "♡";

            const left = Math.random() * 100;
            const size = 18 + Math.random() * 25;
            const duration = 3.7 + Math.random() * 2.4;
            const delay = Math.random() * 0.8;
            const drift = -90 + Math.random() * 180;

            heart.style.left = `${left}%`;
            heart.style.fontSize = `${size}px`;
            heart.style.animationDelay = `${delay}s`;
            heart.style.setProperty("--duration", `${duration}s`);
            heart.style.setProperty("--drift", `${drift}px`);

            celebrationLayer.appendChild(heart);

            window.setTimeout(() => {
                heart.remove();
            }, (duration + delay) * 1000 + 300);
        }
    }

    

    // CASUAL INSPECT / DEVTOOLS DETERRENT
    function preventContextMenu(event) {
        event.preventDefault();
    }

    function preventCommonDevToolsShortcuts(event) {
        const key = event.key.toLowerCase();

        const isWindowsLinuxDevToolsShortcut =
            event.ctrlKey &&
            event.shiftKey &&
            ["i", "j", "c", "k"].includes(key);

        const isMacDevToolsShortcut =
            event.metaKey &&
            event.altKey &&
            ["i", "j", "c"].includes(key);

        const isViewSourceShortcut =
            (event.ctrlKey || event.metaKey) &&
            key === "u";

        const isF12 = event.key === "F12";

        if (
            isWindowsLinuxDevToolsShortcut ||
            isMacDevToolsShortcut ||
            isViewSourceShortcut ||
            isF12
        ) {
            event.preventDefault();
            event.stopPropagation();
        }
    }

    
    // AUTOPLAY RETRY
    let autoplayRetryInstalled = false;

    function installAutoplayRetry() {
        if (autoplayRetryInstalled || musicStarted || musicMuted) {
            return;
        }

        autoplayRetryInstalled = true;

        const retryMusic = async () => {
            const started = await startBackgroundMusic();

            if (!started) {
                return;
            }

            document.removeEventListener("pointerdown", retryMusic, true);
            document.removeEventListener("keydown", retryMusic, true);
            document.removeEventListener("touchstart", retryMusic, true);

            autoplayRetryInstalled = false;
        };

        document.addEventListener("pointerdown", retryMusic, true);
        document.addEventListener("keydown", retryMusic, true);
        document.addEventListener("touchstart", retryMusic, true);
    }

    // EVENT LISTENERS
    document.addEventListener("contextmenu", preventContextMenu);

    document.addEventListener(
        "keydown",
        preventCommonDevToolsShortcuts,
        { capture: true }
    );

    musicToggle.addEventListener("click", toggleBackgroundMusic);

    envelopeTrigger.addEventListener("click", handleEnvelopeClick);

    envelopeTrigger.addEventListener("pointerdown", (event) => {
        event.stopPropagation();
    });

    pageFlipButton.addEventListener("click", flipLetterPage);

    yesButton.addEventListener("click", () => {
        answerLetter("yes");
    });

    document.addEventListener(
        "pointermove",
        watchNoButtonProximity
    );

    noButton.addEventListener("click", () => {
        answerLetter("no");
    });

    window.addEventListener(
        "resize",
        clampNoButtonToViewport
    );

    scene.classList.remove("letter-settled");
    updateMusicButton();

    /*
     * Attempt to start the song as soon as the website loads.
     * If the browser blocks audible autoplay, install a one-time retry that
     * starts it on the visitor's first interaction.
     */
    startBackgroundMusic().then((started) => {
        if (!started) {
            installAutoplayRetry();
        }
    });

    setStage("back");
    setPage("front");
})();
