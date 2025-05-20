Component({
    properties: {
        trueText: {
            type: String,
            value: '开'
        },
        falseText: {
            type: String,
            value: '关'
        },
        checked: {
            type: Boolean,
            value: false
        },
        width: {
            type: Number,
            value: 72
        },
        height: {
            type: Number,
            value: 32
        }
    },
    options: {
        styleIsolation: 'shared', // 解除样式隔离
    },
    methods: {
        onChange() {
            this.setData({
                checked: !this.data.checked
            }, () => {
                this.triggerEvent('change', {
                    value: this.data.checked
                });
            });
        }
    }
});