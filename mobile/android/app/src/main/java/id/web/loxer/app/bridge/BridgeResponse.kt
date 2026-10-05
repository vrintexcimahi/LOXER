package id.web.loxer.app.bridge

import org.json.JSONObject

data class BridgeResponse(
    val callbackId: String,
    val success: Boolean,
    val data: Any? = null,
    val error: String? = null
) {
    fun toJsonString(): String {
        val json = JSONObject()
        json.put("_callbackId", callbackId)
        json.put("success", success)
        if (data != null) {
            when (data) {
                is JSONObject -> json.put("data", data)
                is Map<*, *> -> json.put("data", JSONObject(data))
                is Number -> json.put("data", data)
                is Boolean -> json.put("data", data)
                else -> json.put("data", data.toString())
            }
        } else {
            json.put("data", JSONObject.NULL)
        }
        if (error != null) {
            json.put("error", error)
        } else {
            json.put("error", JSONObject.NULL)
        }
        return json.toString()
    }
}
