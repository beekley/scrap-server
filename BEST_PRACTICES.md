# Best Practices for Vue 3 & TypeScript Refactoring

## 1. TypeScript Quality
- **Strict Types**: Eliminate `any` and unconstrained `unknown` types. Use explicit interfaces and types for all component props, state, and function returns.
- **Discriminated Unions**: When working with polymorhpic data (like parts or job types), leverage discriminated unions instead of `as any` or unsafe type assertions. 
- **Avoid Over-Asserting**: Avoid `as Type` where possible. If a value needs casting due to framework constraints (e.g. reactive unwrap of class instances), do it once at the boundary (e.g. in a computed getter).

## 2. Vue Composition API
- **Script Setup**: Standardize on `<script setup lang="ts">`.
- **Macros**: Use typed macros for props and emits (`defineProps<{ ... }>()`).
- **Composables**: Extract reusable logic (like drag-and-drop or complex calculations) into dedicated `use*` composables. 
- **Template Cleanliness**: Keep templates declarative. Move heavy inline logic (like formatting math or complex conditions) into `computed` properties or utility functions.

## 3. Code Organization
- **Utilities**: Group pure functions into `src/utils/`.
- **Naming**: Use PascalCase for components, camelCase for composables/utils.
- **Styling**: Avoid heavy inline styles. Use scoped CSS classes for better readability.

## 4. Single Responsibility
- Split monolithic components if they grow too large.
- Keep state management centralized in stores or localized in composables; components should primarily focus on view representation.
