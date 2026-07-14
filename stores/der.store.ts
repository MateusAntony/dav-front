interface DerOptions {
  currentEntityId?: string;
  currentAttrId?: string;
  currentRelationshipId?: string;
}

export const useDerOptions = defineStore('der', {
  state: (): DerOptions => ({
    currentEntityId: undefined,
    currentAttrId: undefined,
    currentRelationshipId: undefined,
  }),
  actions: {
    setCurrentEntityId(id: string) {
      this.currentEntityId = id;
    },
    setCurrentAttrId(id: string) {
      this.currentAttrId = id;
    },
    setCurrentRelationshipId(id: string) {
      this.currentRelationshipId = id;
    },
  },
});
