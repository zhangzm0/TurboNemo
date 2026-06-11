// 显示所有列表标签
Object.keys(core._bcm.variable.variable_dict).forEach(id => {
    const def = core._bcm.variable.variable_dict[id];
    if (def.type === 'list') {
        __listDisplay__.show(id);
    }
});