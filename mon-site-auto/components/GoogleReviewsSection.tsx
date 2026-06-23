"use client";

import { useEffect, useRef, useState } from "react";

const GOOGLE_REVIEWS = [
  {
    name: "mpx . anthony",
    text: "Très bonne expérience chez Autologgia. J'ai acheté ma voiture là-bas et tout s'est parfaitement déroulé. Le vendeur est sérieux, transparent et très agréable.",
  },
  {
    name: "Louis Biscarel",
    text: "J'ai acheté ma voiture chez Autologgia et je suis vraiment ravi de mon expérience. Un vendeur super sympa, très professionnel, disponible et à l'écoute du début à la fin. Le véhicule est conforme à ce qui m'avait été annoncé. Je recommande sans hésiter !",
  },
  {
    name: "Joelle Loiseleur",
    text: "Société très sérieuse avec beaucoup de respect pour ses clients et j'ai une petite voiture super!!!",
  },
  {
    name: "Sven Schott",
    text: "Service au top ! J'ai acheté ma voiture chez Autologgia, tout s'est très bien passé. Équipe sérieuse et réactive, je recommande sans hésiter.",
  },
  {
    name: "Jean-Thomas Scanavino",
    text: "Merci à vous pour votre expertise, avec un jeune super, qui connaît ses voitures. Aucun problème durant la vente, Merci à vous, je recommande",
  },
  {
    name: "karen lanniee",
    text: "Merci pour tout ! Je suis ravie de mon nouveau véhicule ! Merci pour votre réactivité, professionnalisme, gentillesse !",
  },
  {
    name: "Cesar Foucher",
    text: "Julien est un très bon vendeur, l'achat de mon Cayenne a été un très bon investissement merci mr Roux",
  },
  {
    name: "Edgar Tag",
    text: "Entreprise sérieuse et professionnelle sa été un plaisir de travailler avec eux.",
  },
  {
    name: "Morgane Page Thevenet",
    text: "Mon véhicule a été importé et Autologgia c'est occupé de toutes les démarches en me le livrant. C'est top !",
  },
  {
    name: "Guilherme Gonçalves Diogo",
    text: "Très bon service. Rien à dire ! Bonnes voitures, et ils font tout pour que le client soit satisfait. Je recommande fortement !",
  },
  {
    name: "charlotte vinas",
    text: "Merci à Julien et son frère pour leurs professionnalisme. Une entreprise familiale au top du top. J'ai acheté un véhicule pour ma fille, tout s'est déroulé à la perfection, sérieux, honnête et arrangeant. Je recommande à 100%",
  },
  {
    name: "Myriam Roux",
    text: "Un grand merci à l'équipe qui est de top niveau. Ils nous ont vendu notre SKODA KODIAQ RS en 1 semaine. Compétence, disponibilité, professionnalisme. Nous rachèterons avec cette super équipe. Myriam",
  },
];

const MOBILE_LOOP_REVIEWS = [
  GOOGLE_REVIEWS[GOOGLE_REVIEWS.length - 1],
  ...GOOGLE_REVIEWS,
  GOOGLE_REVIEWS[0],
];

function QuoteMark({ direction }: { direction: "open" | "close" }) {
  return (
    <svg
      aria-hidden="true"
      className={`h-6 w-6 text-[#C9A84C]/70 ${direction === "close" ? "rotate-180" : ""}`}
      viewBox="0 0 48 48"
      fill="none"
    >
      <path
        d="M20.4 12.5C13.1 15 8.8 20.7 8.8 28.3c0 4.7 2.9 7.6 6.8 7.6 3.7 0 6.5-2.7 6.5-6.3 0-3.4-2.3-5.8-5.7-6.2.8-3.1 3.5-5.7 7.2-7.2l-3.2-3.7Zm19.1 0C32.2 15 27.9 20.7 27.9 28.3c0 4.7 2.9 7.6 6.8 7.6 3.7 0 6.5-2.7 6.5-6.3 0-3.4-2.3-5.8-5.7-6.2.8-3.1 3.5-5.7 7.2-7.2l-3.2-3.7Z"
        fill="currentColor"
      />
    </svg>
  );
}

function ReviewCard({ name, text }: { name: string; text: string }) {
  return (
    <article className="flex h-[26rem] w-full shrink-0 flex-col items-center rounded-2xl border border-navy/15 bg-white px-6 py-7 text-center shadow-[0_18px_45px_rgba(11,25,41,0.08)] md:h-[24rem] md:w-[23.5rem] md:py-8">
      <div className="flex min-h-[5.25rem] flex-col items-center justify-end">
        <h3 className="font-heading text-2xl font-medium leading-tight text-navy">
          {name}
        </h3>
        <div
          className="mt-3 flex justify-center gap-1 text-xl leading-none text-[#C9A84C]"
          aria-label="5 étoiles sur 5"
        >
          <span>★</span>
          <span>★</span>
          <span>★</span>
          <span>★</span>
          <span>★</span>
        </div>
      </div>
      <blockquote className="mt-5 flex w-full max-w-[18.5rem] flex-1 flex-col text-left sm:max-w-[20rem]">
        <span className="flex h-6 w-6 items-center justify-center" aria-hidden="true">
          <QuoteMark direction="open" />
        </span>
        <p className="mt-2 text-center text-sm leading-6 text-navy/78">
          {text}
        </p>
        <span
          className="mt-2 flex h-6 w-6 items-center justify-center self-end"
          aria-hidden="true"
        >
          <QuoteMark direction="close" />
        </span>
      </blockquote>
    </article>
  );
}

export default function GoogleReviewsSection() {
  const duplicatedReviews = [...GOOGLE_REVIEWS, ...GOOGLE_REVIEWS];
  const sectionRef = useRef<HTMLElement | null>(null);
  const mobileScrollerRef = useRef<HTMLDivElement | null>(null);
  const isLoopJumpingRef = useRef(false);
  const activeReviewRef = useRef(0);
  const mobileScrollEndTimerRef = useRef<number | null>(null);
  const [activeReview, setActiveReview] = useState(0);
  const [showMobileHint, setShowMobileHint] = useState(false);

  function getMobileRealIndex(loopIndex: number) {
    if (loopIndex === 0) return GOOGLE_REVIEWS.length - 1;
    if (loopIndex === GOOGLE_REVIEWS.length + 1) return 0;
    return loopIndex - 1;
  }

  function getClosestMobileLoopIndex() {
    const scroller = mobileScrollerRef.current;
    if (!scroller) return 1;

    const scrollerCenter = scroller.scrollLeft + scroller.clientWidth / 2;

    return Array.from(scroller.children).reduce((closestIndex, child, index) => {
      const element = child as HTMLElement;
      const childCenter = element.offsetLeft + element.offsetWidth / 2;
      const currentDistance = Math.abs(childCenter - scrollerCenter);
      const closestElement = scroller.children[closestIndex] as HTMLElement;
      const closestCenter = closestElement.offsetLeft + closestElement.offsetWidth / 2;
      const closestDistance = Math.abs(closestCenter - scrollerCenter);

      return currentDistance < closestDistance ? index : closestIndex;
    }, 0);
  }

  function jumpMobileToLoopIndex(loopIndex: number) {
    const scroller = mobileScrollerRef.current;
    const slide = scroller?.children[loopIndex] as HTMLElement | undefined;
    if (!scroller || !slide) return;

    isLoopJumpingRef.current = true;

    const previousSnapType = scroller.style.scrollSnapType;
    const previousScrollBehavior = scroller.style.scrollBehavior;

    scroller.style.scrollSnapType = "none";
    scroller.style.scrollBehavior = "auto";
    scroller.scrollLeft = slide.offsetLeft - (scroller.clientWidth - slide.offsetWidth) / 2;

    window.requestAnimationFrame(() => {
      scroller.style.scrollSnapType = previousSnapType;
      scroller.style.scrollBehavior = previousScrollBehavior;
      isLoopJumpingRef.current = false;
    });
  }

  function finalizeMobileLoop() {
    const loopIndex = getClosestMobileLoopIndex();
    const targetIndex =
      loopIndex === 0
        ? GOOGLE_REVIEWS.length
        : loopIndex === GOOGLE_REVIEWS.length + 1
          ? 1
          : loopIndex;

    const targetRealIndex = getMobileRealIndex(targetIndex);
    activeReviewRef.current = targetRealIndex;
    setActiveReview(targetRealIndex);

    if (targetIndex !== loopIndex) {
      jumpMobileToLoopIndex(targetIndex);
    }
  }

  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const isMobile = window.matchMedia("(max-width: 767px)").matches;
    if (reducedMotion || !isMobile) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setShowMobileHint(true);
          observer.disconnect();
        }
      },
      { threshold: 0.35 },
    );

    observer.observe(section);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    jumpMobileToLoopIndex(1);

    function handleResize() {
      jumpMobileToLoopIndex(activeReviewRef.current + 1);
    }

    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);

      if (mobileScrollEndTimerRef.current) {
        window.clearTimeout(mobileScrollEndTimerRef.current);
      }
    };
  }, []);

  function handleMobileScroll() {
    const scroller = mobileScrollerRef.current;
    if (!scroller || isLoopJumpingRef.current) return;

    const nextIndex = getClosestMobileLoopIndex();
    const nextRealIndex = getMobileRealIndex(nextIndex);
    activeReviewRef.current = nextRealIndex;
    setActiveReview(nextRealIndex);

    if (mobileScrollEndTimerRef.current) {
      window.clearTimeout(mobileScrollEndTimerRef.current);
    }

    mobileScrollEndTimerRef.current = window.setTimeout(finalizeMobileLoop, 180);
  }

  return (
    <section
      ref={sectionRef}
      id="avis-google"
      className="overflow-hidden border-y border-[#e5e3dd] bg-surface-muted px-6 py-20"
    >
      <div className="mx-auto max-w-7xl">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-xs font-medium uppercase tracking-[0.5em] text-[#C9A84C]">
            Avis Google
          </p>
          <h2 className="mt-4 font-heading text-4xl font-light text-navy md:text-5xl">
            Ils nous ont fait confiance
          </h2>
          <p className="mx-auto mt-5 max-w-2xl text-lg leading-relaxed text-navy/60">
            Parce que l&apos;expérience de nos clients parle mieux que nos promesses.
          </p>
        </div>

        <div className="google-reviews-viewport relative mt-12 hidden md:block">
          <div className="google-reviews-marquee flex w-max gap-6">
            {duplicatedReviews.map((review, index) => (
              <ReviewCard
                key={`${review.name}-${index}`}
                name={review.name}
                text={review.text}
              />
            ))}
          </div>
        </div>

        <div
          ref={mobileScrollerRef}
          className="no-scrollbar -mx-6 mt-10 flex snap-x snap-mandatory gap-4 overflow-x-auto px-[7vw] pb-4 scroll-smooth md:hidden"
          onScroll={handleMobileScroll}
          aria-label="Avis Google à faire glisser horizontalement"
        >
          {MOBILE_LOOP_REVIEWS.map((review, index) => (
            <div
              key={`${review.name}-mobile-${index}`}
              className={`w-[86vw] shrink-0 snap-center ${showMobileHint && index === 1 ? "google-review-mobile-hint" : ""}`}
            >
              <ReviewCard name={review.name} text={review.text} />
            </div>
          ))}
        </div>

        <div className="mt-3 flex flex-col items-center gap-3 text-center md:hidden">
          <p className="text-xs font-medium text-navy/45">
            <span aria-hidden="true" className="mr-2 text-[#C9A84C]/70">←</span>
            Glissez pour voir d&apos;autres avis
            <span aria-hidden="true" className="ml-2 text-[#C9A84C]/70">→</span>
          </p>
          <div className="flex items-center justify-center gap-2" aria-label="Pagination des avis">
            {GOOGLE_REVIEWS.map((review, index) => (
              <span
                key={`${review.name}-dot`}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  activeReview === index ? "w-6 bg-[#C9A84C]" : "w-1.5 bg-navy/18"
                }`}
                aria-hidden="true"
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
