// Smooth page transitions (global)
document.addEventListener("DOMContentLoaded", () => {
    const page = document.querySelector(".page");
    if (!page) return;

    document.addEventListener("click", (e) => {
        const link = e.target.closest("a[href]");
        if (!link) return;

        const hrefAttr = link.getAttribute("href") || "";

        // Ignore anchors, external links, mailto/tel, new tabs
        if (
            !hrefAttr ||
            hrefAttr.startsWith("#") ||
            hrefAttr.startsWith("http") ||
            hrefAttr.startsWith("mailto:") ||
            hrefAttr.startsWith("tel:") ||
            link.target === "_blank"
        ) return;

        // If you're opening pages via file://, don't intercept (prevents "dead links")
        if (location.protocol === "file:") return;

        e.preventDefault();

        page.classList.add("page-exit");

        // Use the fully resolved URL
        const targetUrl = link.href;

        setTimeout(() => {
            window.location.href = targetUrl;
        }, 180);
    });
});
