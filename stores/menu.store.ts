import {
  DerFlowEnum,
  previousDerMenuMapping,
  PDVMenusEnum,
} from '~/src/interfaces/pdv-menu';

export enum FormScope {
  CREATE,
  EDIT,
}

export type DiagramListMode = 'own' | 'shared';

interface MenuOptions {
  activeMainMenu: PDVMenusEnum;
  activeDerMenu: DerFlowEnum;
  previousDerMenu?: DerFlowEnum;
  scope: FormScope;
  diagramListMode: DiagramListMode;
}

export const useMenuOptions = defineStore('menu', {
  state: (): MenuOptions => ({
    activeMainMenu: PDVMenusEnum.DEFAULT,
    activeDerMenu: DerFlowEnum.DEFAULT,
    previousDerMenu: undefined,
    scope: FormScope.CREATE,
    diagramListMode: 'own',
  }),
  actions: {
    setActiveMainMenu(menu: PDVMenusEnum) {
      this.activeMainMenu = menu;
    },
    setActiveDerMenu(menu: DerFlowEnum) {
      this.activeDerMenu = menu;
      this.setPreviousDerMenu();
    },
    setPreviousDerMenu() {
      this.previousDerMenu = previousDerMenuMapping[this.activeDerMenu];
    },
    setScope(scope: FormScope) {
      this.scope = scope;
    },
    setDiagramListMode(mode: DiagramListMode) {
      this.diagramListMode = mode;
    },
    isEditScope() {
      return this.scope === FormScope.EDIT;
    },
    isCreateScope() {
      return this.scope === FormScope.CREATE;
    },
  },
});