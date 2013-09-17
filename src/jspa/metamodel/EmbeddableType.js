/**
 * @class jspa.metamodel.EmbeddableType
 * @extends jspa.metamodel.ManagedType
 */
jspa.metamodel.EmbeddableType = jspa.metamodel.ManagedType.inherit({
	persistenceType: jspa.metamodel.Type.PersistenceType.EMBEDDABLE,

    /**
     * @param {jspa.util.State} state
     * @param {*} obj
     * @param {Object} value
     * @return {*}
     */
    fromDatabaseValue: function(state, obj, value) {
        if (!obj && value) {
            obj = this.create();

            Object.defineProperty(obj, '__jspaEntity__', {
                value: state.entity
            });
        }

        return this.superCall(state, obj, value);
    }
});