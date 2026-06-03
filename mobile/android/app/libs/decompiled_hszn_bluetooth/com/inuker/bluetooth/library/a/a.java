/*
 * Decompiled with CFR 0.152.
 */
package com.inuker.bluetooth.library.a;

import com.inuker.bluetooth.library.a.b;
import com.inuker.bluetooth.library.a.c;
import java.util.LinkedList;
import java.util.List;

public class a {
    public byte[] a;
    public List<b> b = new LinkedList<b>();

    public a(byte[] byArray) {
        if (!com.inuker.bluetooth.library.e.c.d(byArray)) {
            this.a = com.inuker.bluetooth.library.e.c.c(byArray);
            this.b.addAll(c.a(this.a));
        }
    }

    public String toString() {
        StringBuilder stringBuilder = new StringBuilder();
        stringBuilder.append(String.format("preParse: %s\npostParse:\n", com.inuker.bluetooth.library.e.c.b(this.a)));
        for (int i2 = 0; i2 < this.b.size(); ++i2) {
            stringBuilder.append(this.b.get(i2).toString());
            if (i2 == this.b.size() - 1) continue;
            stringBuilder.append("\n");
        }
        return stringBuilder.toString();
    }
}

