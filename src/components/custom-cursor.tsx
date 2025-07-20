"use client";

import { useEffect, useRef, useState } from "react";

import { isMobile } from "@/constants/custom-cursor-utils";

export function CustomCursor() {
  const cursorRef = useRef<HTMLDivElement>(null);
  const mousePositionRef = useRef({ x: 0, y: 0 });
  const previousMousePositionRef = useRef({ x: 0, y: 0 });
  const circlePositionRef = useRef({ x: 0, y: 0 });
  const currentScaleRef = useRef(0);
  const currentAngleRef = useRef(0);
  const animationRef = useRef<number>(0);
  const mouseDownRef = useRef(false);
  const [size, setSize] = useState<
    "default" | "hover" | "active" | "hoverActive"
  >("default");

  const resizeCursor = (
    newSize: "default" | "hover" | "active" | "hoverActive",
    setPosition = true
  ) => {
    setSize(newSize);
    if (!cursorRef.current) return;

    let width = "2.5rem",
      height = "2.5rem",
      top = "-1.25rem",
      left = "-1.25rem";
    let addPrimary = false;

    switch (newSize) {
      case "active":
        width = height = "1.5rem";
        top = left = "-0.75rem";
        break;
      case "hoverActive":
        width = height = "0.5rem";
        top = left = "-0.25rem";
        addPrimary = true;
        break;
      case "hover":
        width = height = "1rem";
        top = left = "-0.5rem";
        addPrimary = true;
        break;
    }

    cursorRef.current.animate([{ width, height }], {
      duration: 200,
      fill: "forwards",
      easing: "cubic-bezier(0.3, 0.2, 0.2, 1.4)",
    });

    if (setPosition) {
      cursorRef.current.style.top = top;
      cursorRef.current.style.left = left;
    }

    cursorRef.current.classList.toggle("bg-transparent", !addPrimary);
    cursorRef.current.classList.toggle("bg-white", addPrimary);
  };

  useEffect(() => {
    if (isMobile) return;

    const isClickableElement = (target: HTMLElement | null): boolean => {
      if (!target) return false;
      return (
        ["A", "BUTTON"].includes(target.tagName) ||
        target.closest('[data-slot="button"], a, button') !== null
      );
    };

    const updateCursor = (e: MouseEvent) => {
      mousePositionRef.current = { x: e.clientX, y: e.clientY };
      const hovered = document.elementFromPoint(
        e.clientX,
        e.clientY
      ) as HTMLElement;
      const clickable = isClickableElement(hovered);
      resizeCursor(
        mouseDownRef.current
          ? clickable
            ? "hoverActive"
            : "active"
          : clickable
          ? "hover"
          : "default"
      );
    };

    const handleMouseMove = (e: MouseEvent) => updateCursor(e);
    const handleMouseDown = (e: MouseEvent) => {
      mouseDownRef.current = true;
      updateCursor(e);
    };
    const handleMouseUp = (e: MouseEvent) => {
      mouseDownRef.current = false;
      updateCursor(e);
    };

    const tick = () => {
      if (!cursorRef.current) return;

      const speed = 0.5;
      const { x, y } = mousePositionRef.current;
      circlePositionRef.current.x += (x - circlePositionRef.current.x) * speed;
      circlePositionRef.current.y += (y - circlePositionRef.current.y) * speed;

      const dx = x - previousMousePositionRef.current.x;
      const dy = y - previousMousePositionRef.current.y;
      previousMousePositionRef.current = { x, y };

      const velocity = Math.min(Math.hypot(dx, dy) * 4, 150);
      const scaleValue = (velocity / 150) * 0.4;
      currentScaleRef.current += (scaleValue - currentScaleRef.current) * speed;

      const scale = `scale(${1 + currentScaleRef.current}, ${
        1 - currentScaleRef.current
      })`;
      const angle = Math.atan2(dy, dx) * (180 / Math.PI);
      if (velocity > 20) currentAngleRef.current = angle;
      const rotate = `rotate(${currentAngleRef.current}deg)`;

      cursorRef.current.style.transform = `translate(-50%, -50%) ${rotate} ${scale}`;
      cursorRef.current.style.left = `${circlePositionRef.current.x}px`;
      cursorRef.current.style.top = `${circlePositionRef.current.y}px`;

      animationRef.current = requestAnimationFrame(tick);
    };

    window.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mousedown", handleMouseDown);
    document.addEventListener("mouseup", handleMouseUp);
    animationRef.current = requestAnimationFrame(tick);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mousedown", handleMouseDown);
      document.removeEventListener("mouseup", handleMouseUp);
      cancelAnimationFrame(animationRef.current);
    };
  }, []);

  return (
    <div
      ref={cursorRef}
      className={`cursor ${
        isMobile ? "hidden" : "inline-block"
      } pointer-events-none fixed z-[2147483647] h-10 w-10 rounded-full border-2 border-solid border-brand-orange bg-transparent`}
      data-cursor-size={size}
    />
  );
}
