/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  android.content.Context
 *  android.content.Intent
 */
package com.inuker.bluetooth.library.d;

import android.content.Context;
import android.content.Intent;
import com.inuker.bluetooth.library.d.a;
import com.inuker.bluetooth.library.d.a.g;
import com.inuker.bluetooth.library.d.h;
import java.util.Arrays;
import java.util.List;
import java.util.UUID;

public class b
extends a {
    private static final String[] d = new String[]{"action.character_changed"};

    protected b(h h2) {
        super(h2);
    }

    public static b a(h h2) {
        return new b(h2);
    }

    @Override
    List<String> a() {
        return Arrays.asList(d);
    }

    @Override
    boolean a(Context context, Intent intent) {
        String string = intent.getStringExtra("extra.mac");
        UUID uUID = (UUID)intent.getSerializableExtra("extra.service.uuid");
        UUID uUID2 = (UUID)intent.getSerializableExtra("extra.character.uuid");
        byte[] byArray = intent.getByteArrayExtra("extra.byte.value");
        this.a(string, uUID, uUID2, byArray);
        return true;
    }

    private void a(String string, UUID uUID, UUID uUID2, byte[] byArray) {
        List<g> list = this.a(com.inuker.bluetooth.library.d.a.b.class);
        for (g g2 : list) {
            g2.invoke(string, uUID, uUID2, byArray);
        }
    }
}

