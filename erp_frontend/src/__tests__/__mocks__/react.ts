// Minimal React mock for non-browser test imports
export const createContext = () => ({});
export const useContext = () => ({});
export const useState = (v: unknown) => [v, () => {}];
export const useCallback = (fn: unknown) => fn;
export const useEffect = () => {};
export type ReactNode = unknown;

const ReactMock = { createContext, useContext, useState, useCallback, useEffect };

export default ReactMock;
